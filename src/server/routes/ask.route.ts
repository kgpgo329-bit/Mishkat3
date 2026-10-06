import { Router, Request, Response, NextFunction } from 'express';
import { AskRequestSchema } from '../../shared/schemas/index.js';
import {
  AskResponse,
  InteractionStatus,
  CandidateChunk,
  QuestionRetrievalResult,
  EvidenceVerificationResult,
  SufficiencyEvaluation,
  FollowUpQuestion,
  SpecialistReferralInfo,
  PERSONAL_FATWA_NOTICE,
  SPECIALIST_WHY_REFER,
  OFFICIAL_REFERRAL_AUTHORITY,
} from '../../shared/types/index.js';
import { getAIProvider } from '../ai/GeminiAIProvider.js';
import { HybridRetriever } from '../retrieval/hybridRetriever.js';
import { EvidenceVerificationService } from '../verification/evidenceVerificationService.js';
import { GroundedAnswerService, INSUFFICIENT_COVERAGE_NOTICE } from '../answer/groundedAnswerService.js';
import { interactionStorage } from '../storage/InMemoryInteractionStorage.js';

export const askRouter = Router();

const retrieverInstance = new HybridRetriever();

askRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = AskRequestSchema.parse(req.body);
    const interactionId = `int_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Step 3: AI Question Understanding
    const understanding = await getAIProvider().understandQuestion({
      question: validated.question,
      categoryHint: validated.category,
    });

    let status: InteractionStatus = 'NOT_IMPLEMENTED';
    let clarificationPrompt: string | undefined;

    if (understanding.isPersonalFatwa) {
      status = 'PERSONAL_FATWA';
    } else if (understanding.needsClarification) {
      status = 'NEEDS_CLARIFICATION';
      clarificationPrompt = understanding.clarificationReason;
    }

    // Step 5: Minimal Hybrid Retrieval over trusted KnowledgeChunks
    let retrievalResult: QuestionRetrievalResult | undefined;
    let candidates: CandidateChunk[] = [];
    let verifiedEvidence: EvidenceVerificationResult[] = [];
    let sufficiency: SufficiencyEvaluation | undefined;

    if (!understanding.isPersonalFatwa && !understanding.needsClarification) {
      retrievalResult = await retrieverInstance.retrieve({
        question: validated.question,
        normalizedQuestion: understanding.normalizedQuestion,
        claims: understanding.claims,
      });
      candidates = retrievalResult.allCandidates;

      // Step 6: Evidence Verification + Sufficiency
      if (retrievalResult.claimResults.length > 0) {
        const verificationService = new EvidenceVerificationService();
        const verificationResult = await verificationService.verifyClaims({
          claimResults: retrievalResult.claimResults,
          maxCandidatesPerClaim: 3,
        });

        verifiedEvidence = verificationResult.verifiedEvidence;
        sufficiency = verificationResult.sufficiency;

        if (sufficiency.sufficiencyState === 'SUFFICIENT') {
          status = 'SUFFICIENT';
        } else if (sufficiency.sufficiencyState === 'PARTIAL') {
          status = 'PARTIAL';
        } else {
          status = 'INSUFFICIENT';
        }
      }
    }

    // Step 7: Grounded Answer Generation + Citations + Grounding Validation
    const answerService = new GroundedAnswerService();
    const answerResult = await answerService.generateAnswer({
      question: validated.question,
      sufficiency,
      verifiedEvidence,
      candidates,
      status,
      understanding,
    });

    status = answerResult.status;

    // Step 8: AI Deep Learning Follow-Up Suggestions
    // Generate follow-ups ONLY when answer result is ANSWERED or usable PARTIAL
    let followUps: FollowUpQuestion[] = [];
    const isEligibleAnswer =
      (status === 'ANSWERED' || status === 'PARTIAL') &&
      Boolean(answerResult.answer) &&
      !answerResult.answer?.includes(INSUFFICIENT_COVERAGE_NOTICE) &&
      answerResult.grounding?.remedyAction !== 'DOWNGRADE';

    if (isEligibleAnswer && answerResult.answer) {
      try {
        // Safe Patch 3 Rule 1: Allowed input for follow-up generation:
        // - original user question
        // - final grounded answer
        // - SUPPORTED verified claims & supported portions of PARTIAL claims
        // - VERIFIED evidence excerpts already accepted by the pipeline
        const supportedVerifiedClaims: string[] = [];
        if (retrievalResult?.claimResults) {
          for (const cr of retrievalResult.claimResults) {
            const claimEvs = verifiedEvidence.filter(
              (e) => e.claimId === cr.claimId || e.claimId === cr.claim
            );
            const hasSupported = claimEvs.some((e) => e.verificationStatus === 'SUPPORTED');
            const hasPartial = claimEvs.some((e) => e.verificationStatus === 'PARTIAL');
            if (hasSupported || hasPartial) {
              supportedVerifiedClaims.push(cr.claim);
            }
          }
        }

        const acceptedChunkIds = new Set(
          verifiedEvidence
            .filter((e) => e.verificationStatus === 'SUPPORTED' || e.verificationStatus === 'PARTIAL')
            .map((e) => e.chunkId)
        );
        const verifiedEvidenceExcerpts = candidates
          .filter((c) => acceptedChunkIds.has(c.chunkId))
          .map((c) => ({
            title: c.title,
            sourceName: c.sourceName,
            content: c.content,
          }));

        if (verifiedEvidenceExcerpts.length === 0 && acceptedChunkIds.size > 0) {
          verifiedEvidence
            .filter((e) => e.verificationStatus === 'SUPPORTED' || e.verificationStatus === 'PARTIAL')
            .forEach((e) => {
              verifiedEvidenceExcerpts.push({
                title: 'دليل محقق',
                sourceName: e.sourceId,
                content: e.relation || '',
              });
            });
        }

        followUps = await getAIProvider().generateFollowUps({
          originalQuestion: validated.question,
          groundedAnswer: answerResult.answer,
          parentInteractionId: interactionId,
          category: understanding.category,
          topic: understanding.topic,
          keyClaims: supportedVerifiedClaims,
          verifiedClaims: supportedVerifiedClaims,
          verifiedEvidenceExcerpts,
        });
      } catch {
        // Step 8 Failure Isolation: never fail the original grounded answer if follow-up generation fails
        followUps = [];
      }
    }

    const specialistReferral: SpecialistReferralInfo | undefined =
      status === 'PERSONAL_FATWA'
        ? {
            message: PERSONAL_FATWA_NOTICE,
            whyRefer: SPECIALIST_WHY_REFER,
            authorityName: OFFICIAL_REFERRAL_AUTHORITY.authorityName,
            officialWebsite: OFFICIAL_REFERRAL_AUTHORITY.officialWebsite,
            contactMethods: OFFICIAL_REFERRAL_AUTHORITY.contactMethods,
            purpose: OFFICIAL_REFERRAL_AUTHORITY.purpose,
            authority: OFFICIAL_REFERRAL_AUTHORITY,
          }
        : undefined;

    const response: AskResponse = {
      interactionId,
      sessionId: validated.sessionId,
      origin: validated.origin,
      parentInteractionId: validated.parentInteractionId,
      createdAt: new Date().toISOString(),
      status,
      question: validated.question,
      answer: status === 'PERSONAL_FATWA' ? undefined : answerResult.answer,
      claims: understanding.claims,
      evidence: status === 'PERSONAL_FATWA' ? [] : verifiedEvidence, // Step 6: Verified evidence
      candidates: status === 'PERSONAL_FATWA' ? [] : candidates, // Step 5: Candidate chunks
      retrieval: status === 'PERSONAL_FATWA' ? undefined : retrievalResult,
      sufficiency: status === 'PERSONAL_FATWA' ? undefined : sufficiency, // Step 6: Sufficiency evaluation
      sources: status === 'PERSONAL_FATWA' ? [] : answerResult.sources,
      citations: status === 'PERSONAL_FATWA' ? [] : answerResult.citations,
      grounding: status === 'PERSONAL_FATWA' ? undefined : answerResult.grounding,
      followUps: status === 'PERSONAL_FATWA' ? [] : followUps, // Step 8: Educational follow-ups
      clarificationPrompt,
      specialistReferral,
      understanding,
      journeyState: {
        totalInteractions: 1,
        verifiedCount: status === 'PERSONAL_FATWA' ? 0 : answerResult.citations.length > 0 ? 1 : 0,
        assessmentEligible: false,
      },
    };

    // Store interaction for active session retrieval
    interactionStorage.set(interactionId, response);

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
});
