import {
  CandidateChunk,
  ClaimRetrievalResult,
  EvidenceVerificationResult,
  SufficiencyEvaluation,
  SufficiencyState,
} from '../../shared/types/index.js';
import { AIProvider } from '../ai/AIProvider.js';
import { getAIProvider } from '../ai/GeminiAIProvider.js';

export interface VerifyClaimsParams {
  claimResults: ClaimRetrievalResult[];
  maxCandidatesPerClaim?: number;
  maxConcurrency?: number;
}

export interface VerificationPipelineResult {
  verifiedEvidence: EvidenceVerificationResult[];
  sufficiency: SufficiencyEvaluation;
  claimEvidenceMap: Record<string, EvidenceVerificationResult[]>;
}

export class EvidenceVerificationService {
  private aiProvider: AIProvider;
  private verificationCache: Map<string, EvidenceVerificationResult> = new Map();

  constructor(aiProvider?: AIProvider) {
    this.aiProvider = aiProvider || getAIProvider();
  }

  /**
   * Verifies retrieved candidate chunks against atomic claims and assesses sufficiency.
   * Uses bounded concurrency (max 2 concurrent AI calls) across independent claims
   * while strictly preserving deterministic original order and decision logic.
   */
  async verifyClaims(params: VerifyClaimsParams): Promise<VerificationPipelineResult> {
    const maxPerClaim = params.maxCandidatesPerClaim ?? 3;
    const concurrency = Math.min(params.maxConcurrency ?? 2, 2);
    const totalClaims = params.claimResults.length;

    interface ClaimEvaluationOutput {
      claimId: string;
      claimText: string;
      claimEvidences: EvidenceVerificationResult[];
      hasSupported: boolean;
      hasPartial: boolean;
    }

    const evaluateSingleClaim = async (
      claimResult: ClaimRetrievalResult
    ): Promise<ClaimEvaluationOutput> => {
      const claimId = claimResult.claimId;
      const claimText = claimResult.claim.trim();
      const candidatesToTest = claimResult.candidates.slice(0, maxPerClaim);

      const claimEvidences: EvidenceVerificationResult[] = [];
      let claimHasSupported = false;
      let claimHasPartial = false;

      for (const candidate of candidatesToTest) {
        const evalResult = await this.verifySingleClaimEvidence(claimText, candidate, claimId);

        claimEvidences.push(evalResult);

        if (evalResult.verificationStatus === 'SUPPORTED') {
          claimHasSupported = true;
          // Performance optimization: strong supported evidence found for this claim, proceed to next claim
          if (evalResult.confidence >= 0.8) {
            break;
          }
        } else if (evalResult.verificationStatus === 'PARTIAL') {
          claimHasPartial = true;
        }
      }

      return {
        claimId,
        claimText,
        claimEvidences,
        hasSupported: claimHasSupported,
        hasPartial: claimHasPartial,
      };
    };

    // Bounded concurrency pool across independent claims (maxConcurrency <= 2)
    const evaluatedClaims: ClaimEvaluationOutput[] = new Array(totalClaims);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < totalClaims) {
        const currentIndex = nextIndex++;
        evaluatedClaims[currentIndex] = await evaluateSingleClaim(params.claimResults[currentIndex]);
      }
    };

    const workerCount = Math.min(concurrency, totalClaims);
    if (workerCount > 0) {
      const workers = Array.from({ length: workerCount }, () => worker());
      await Promise.all(workers);
    }

    // Reconstruct deterministic original ordering
    const verifiedEvidence: EvidenceVerificationResult[] = [];
    const claimEvidenceMap: Record<string, EvidenceVerificationResult[]> = {};
    let supportedClaimsCount = 0;
    let partialClaimsCount = 0;
    const unsupportedClaimsList: string[] = [];

    for (let i = 0; i < totalClaims; i++) {
      const output = evaluatedClaims[i];
      if (!output) continue;

      claimEvidenceMap[output.claimId] = output.claimEvidences;
      for (const ev of output.claimEvidences) {
        verifiedEvidence.push(ev);
      }

      if (output.hasSupported) {
        supportedClaimsCount++;
      } else if (output.hasPartial) {
        partialClaimsCount++;
        unsupportedClaimsList.push(output.claimText);
      } else {
        unsupportedClaimsList.push(output.claimText);
      }
    }

    const sufficiency = EvidenceVerificationService.calculateSufficiency(
      params.claimResults.map((c) => c.claim),
      verifiedEvidence,
      supportedClaimsCount,
      partialClaimsCount,
      unsupportedClaimsList
    );

    return {
      verifiedEvidence,
      sufficiency,
      claimEvidenceMap,
    };
  }

  /**
   * Verifies a single candidate chunk against a claim, with caching.
   */
  async verifySingleClaimEvidence(
    claim: string,
    candidate: CandidateChunk,
    claimId?: string
  ): Promise<EvidenceVerificationResult> {
    const claimText = claim.trim();
    const cacheKey = `${claimText}::${candidate.contentHash}`;

    if (this.verificationCache.has(cacheKey)) {
      return this.verificationCache.get(cacheKey)!;
    }

    let evalResult: EvidenceVerificationResult;
    try {
      evalResult = await this.aiProvider.verifyEvidence({
        claim: claimText,
        claimId: claimId || '',
        candidateChunk: {
          chunkId: candidate.chunkId,
          documentId: candidate.documentId,
          sourceId: candidate.sourceId,
          title: candidate.title,
          text: candidate.content || (candidate as any).text || '',
          category: candidate.category,
          contentHash: candidate.contentHash,
          officialUrl: candidate.sourceUrl,
          metadata: candidate.locatorMetadata,
        },
      });
    } catch {
      evalResult = {
        evidenceId: `ev_fail_${Date.now()}`,
        claimId: claimId || '',
        sourceId: candidate.sourceId,
        chunkId: candidate.chunkId,
        relation: 'فشل التحقق الآلي من الدليل',
        verificationStatus: 'VERIFICATION_FAILED',
        confidence: 0,
      };
    }

    this.verificationCache.set(cacheKey, evalResult);
    return evalResult;
  }

  static calculateSufficiency(
    claims: string[],
    verifiedEvidence: EvidenceVerificationResult[],
    presetSupportedCount?: number,
    presetPartialCount?: number,
    presetUnsupportedList?: string[]
  ): SufficiencyEvaluation {
    const totalClaims = claims.length;
    let supportedClaimsCount = presetSupportedCount;
    let partialClaimsCount = presetPartialCount;
    let unsupportedClaimsList = presetUnsupportedList;

    if (supportedClaimsCount === undefined) {
      supportedClaimsCount = 0;
      partialClaimsCount = 0;
      unsupportedClaimsList = [];

      for (let i = 0; i < claims.length; i++) {
        const claimId = `claim_${i}`;
        const claimEvs = verifiedEvidence.filter((e) => e.claimId === claimId || e.claimId === claims[i]);
        const hasSupported = claimEvs.some((e) => e.verificationStatus === 'SUPPORTED');
        const hasPartial = claimEvs.some((e) => e.verificationStatus === 'PARTIAL');

        if (hasSupported) {
          supportedClaimsCount++;
        } else if (hasPartial) {
          partialClaimsCount++;
          unsupportedClaimsList.push(claims[i]);
        } else {
          unsupportedClaimsList.push(claims[i]);
        }
      }
    }

    const claimCoverage = totalClaims > 0 ? Number((supportedClaimsCount / totalClaims).toFixed(2)) : 0;
    let sufficiencyState: SufficiencyState;

    if (totalClaims === 0) {
      sufficiencyState = 'INSUFFICIENT';
    } else if (supportedClaimsCount === totalClaims) {
      sufficiencyState = 'SUFFICIENT';
    } else if (supportedClaimsCount > 0 && claimCoverage >= 0.7) {
      sufficiencyState = 'SUFFICIENT';
    } else if (supportedClaimsCount > 0 || (partialClaimsCount ?? 0) > 0) {
      sufficiencyState = 'PARTIAL';
    } else {
      sufficiencyState = 'INSUFFICIENT';
    }

    return {
      sufficiencyState,
      claimCoverage,
      supportedClaimsCount,
      totalClaimsCount: totalClaims,
      unsupportedClaims: unsupportedClaimsList ?? [],
    };
  }
}
