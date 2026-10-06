import {
  AskResponse,
  InteractionStatus,
  CandidateChunk,
  EvidenceVerificationResult,
  SufficiencyEvaluation,
  QuestionUnderstandingResult,
  AnswerCitation,
  GroundingValidationResult,
  TrustedSource,
  KnowledgeChunk,
} from '../../shared/types/index.js';
import { AIProvider } from '../ai/AIProvider.js';
import { getAIProvider } from '../ai/GeminiAIProvider.js';
import { LocalJsonKnowledgeRepository } from '../repository/LocalJsonKnowledgeRepository.js';

export const PARTIAL_COVERAGE_NOTICE =
  'تنبيه: المصادر المعتمدة المتوفرة حالياً تجيب جزئياً عن السؤال، ولم تتوفر تغطية كافية لجميع جوانبه.';

export const INSUFFICIENT_COVERAGE_NOTICE =
  'لم أجد في المصادر المعتمدة المتاحة أدلة كافية لصياغة إجابة موثوقة عن هذا السؤال.';

export const SERVICE_ERROR_NOTICE =
  'تعذر توليد الإجابة المؤصلة حالياً بسبب خطأ في الخدمة. يرجى المحاولة لاحقاً.';

export interface GenerateAnswerInput {
  question: string;
  sufficiency?: SufficiencyEvaluation;
  verifiedEvidence?: EvidenceVerificationResult[];
  candidates?: CandidateChunk[];
  status: InteractionStatus;
  understanding?: QuestionUnderstandingResult;
}

export interface GroundedAnswerResultOutput {
  status: InteractionStatus;
  answer?: string;
  citations: AnswerCitation[];
  sources: TrustedSource[];
  grounding?: GroundingValidationResult;
}

export class GroundedAnswerService {
  private aiProvider: AIProvider;
  private repo: LocalJsonKnowledgeRepository;

  constructor(aiProvider?: AIProvider, repo?: LocalJsonKnowledgeRepository) {
    this.aiProvider = aiProvider || getAIProvider();
    this.repo = repo || new LocalJsonKnowledgeRepository();
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<GroundedAnswerResultOutput> {
    const { question, sufficiency, verifiedEvidence = [], candidates = [], status, understanding } = input;

    // Gate 1: Personal Fatwa Route
    if (status === 'PERSONAL_FATWA' || understanding?.isPersonalFatwa) {
      return {
        status: 'PERSONAL_FATWA',
        answer: undefined,
        citations: [],
        sources: [],
      };
    }

    // Gate 2: Needs Clarification Route
    if (status === 'NEEDS_CLARIFICATION' || understanding?.needsClarification) {
      return {
        status: 'NEEDS_CLARIFICATION',
        answer: undefined,
        citations: [],
        sources: [],
      };
    }

    // Gate 3: Insufficient Evidence Abstention
    if (!sufficiency || sufficiency.sufficiencyState === 'INSUFFICIENT') {
      return {
        status: 'INSUFFICIENT',
        answer: INSUFFICIENT_COVERAGE_NOTICE,
        citations: [],
        sources: [],
        grounding: {
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT',
        },
      };
    }

    // Filter evidence strictly to verified accepted items (SUPPORTED or usable PARTIAL)
    const acceptedEvidence = verifiedEvidence.filter(
      (ev) => ev.verificationStatus === 'SUPPORTED' || ev.verificationStatus === 'PARTIAL'
    );

    if (acceptedEvidence.length === 0) {
      return {
        status: 'INSUFFICIENT',
        answer: INSUFFICIENT_COVERAGE_NOTICE,
        citations: [],
        sources: [],
        grounding: {
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT',
        },
      };
    }

    // Build map of accepted candidate chunks
    const acceptedChunkIds = new Set(acceptedEvidence.map((e) => e.chunkId));
    const candidateMap = new Map<string, CandidateChunk>();
    for (const cand of candidates) {
      if (acceptedChunkIds.has(cand.chunkId)) {
        candidateMap.set(cand.chunkId, cand);
      }
    }

    const chunksToProvide: KnowledgeChunk[] = [];
    for (const chunkId of acceptedChunkIds) {
      const cand = candidateMap.get(chunkId);
      if (cand) {
        chunksToProvide.push({
          chunkId: cand.chunkId,
          sourceId: cand.sourceId,
          documentId: cand.documentId,
          title: cand.title,
          text: cand.content,
          category: cand.category,
          officialUrl: cand.sourceUrl,
          contentHash: cand.contentHash,
        });
      } else {
        const dbChunk = await this.repo.getChunkById(chunkId);
        if (dbChunk) {
          chunksToProvide.push(dbChunk);
        }
      }
    }

    try {
      // Step 7.1: Synthesize Grounded Answer using verified evidence only
      const generatedResult = await this.aiProvider.generateGroundedAnswer({
        question,
        understanding,
        verifiedEvidence: acceptedEvidence,
        chunks: chunksToProvide,
      });

      let finalAnswer = generatedResult.answer?.trim() || '';

      // If sufficiency is PARTIAL, ensure explicit incomplete-evidence notice is included
      if (sufficiency.sufficiencyState === 'PARTIAL') {
        if (!finalAnswer.includes(PARTIAL_COVERAGE_NOTICE)) {
          finalAnswer = `${PARTIAL_COVERAGE_NOTICE}\n\n${finalAnswer}`;
        }
      }

      // Step 7.2: Lightweight single-pass grounding validation
      let groundingResult: GroundingValidationResult = await this.aiProvider.validateGrounding({
        answer: finalAnswer,
        acceptedEvidence,
        chunks: chunksToProvide,
      });

      // Handle ungrounded claims according to remedyAction
      let finalStatus: InteractionStatus =
        sufficiency.sufficiencyState === 'SUFFICIENT' ? 'ANSWERED' : 'PARTIAL';

      if (!groundingResult.isGrounded) {
        if (groundingResult.remedyAction === 'DOWNGRADE') {
          if (finalStatus === 'ANSWERED') {
            finalStatus = 'PARTIAL';
            if (!finalAnswer.includes(PARTIAL_COVERAGE_NOTICE)) {
              finalAnswer = `${PARTIAL_COVERAGE_NOTICE}\n\n${finalAnswer}`;
            }
          } else {
            // Already PARTIAL but ungrounded -> abstain strictly
            return {
              status: 'INSUFFICIENT',
              answer: INSUFFICIENT_COVERAGE_NOTICE,
              citations: [],
              sources: [],
              grounding: groundingResult,
            };
          }
        }
      }

      // Step 7.3: Build traceable citations strictly from accepted and cited chunks
      // Reject any fake citations or citations of unverified/unsupported chunks
      const citations: AnswerCitation[] = [];
      const citedIds = new Set(generatedResult.citedChunkIds);

      // If model cited chunks, filter to accepted chunks only; if empty, use all accepted chunks
      const effectiveChunkIds =
        citedIds.size > 0
          ? Array.from(citedIds).filter((id) => acceptedChunkIds.has(id))
          : Array.from(acceptedChunkIds);

      for (const chunkId of effectiveChunkIds) {
        const chunk = chunksToProvide.find((c) => c.chunkId === chunkId);
        if (!chunk) continue;

        const cand = candidateMap.get(chunkId);
        const sourceMeta = await this.repo.getSourceById(chunk.sourceId);

        citations.push({
          sourceId: chunk.sourceId,
          sourceName: cand?.sourceName || sourceMeta?.name || chunk.sourceId,
          officialUrl: chunk.officialUrl || cand?.sourceUrl || sourceMeta?.officialUrl,
          documentId: chunk.documentId,
          chunkId: chunk.chunkId,
          title: chunk.title,
        });
      }

      // Collect unique trusted sources corresponding to citations
      const uniqueSourceIds = new Set(citations.map((c) => c.sourceId));
      const sources: TrustedSource[] = [];
      for (const sId of uniqueSourceIds) {
        const src = await this.repo.getSourceById(sId);
        if (src) {
          sources.push(src);
        }
      }

      return {
        status: finalStatus,
        answer: finalAnswer,
        citations,
        sources,
        grounding: groundingResult,
      };
    } catch (err: unknown) {
      return {
        status: 'SERVICE_ERROR',
        answer: SERVICE_ERROR_NOTICE,
        citations: [],
        sources: [],
        grounding: {
          isGrounded: false,
          unsupportedClaims: [],
          remedyAction: 'DOWNGRADE',
        },
      };
    }
  }
}
