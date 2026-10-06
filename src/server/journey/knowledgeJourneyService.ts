import {
  AskResponse,
  JourneyDashboardData,
  InteractionRecord,
} from '../../shared/types/index.js';
import { INSUFFICIENT_COVERAGE_NOTICE } from '../answer/groundedAnswerService.js';
import { interactionStorage } from '../storage/InMemoryInteractionStorage.js';

export function isEligibleForAssessment(response: AskResponse): boolean {
  // Ineligible status routes
  if (
    response.status === 'PERSONAL_FATWA' ||
    response.status === 'NEEDS_CLARIFICATION' ||
    response.status === 'SERVICE_ERROR' ||
    response.status === 'INSUFFICIENT' ||
    response.status === 'NOT_IMPLEMENTED'
  ) {
    return false;
  }

  // Must contain actual answer content and not be an abstention message
  if (!response.answer || response.answer.includes(INSUFFICIENT_COVERAGE_NOTICE)) {
    return false;
  }

  // Grounding validation must not have downgraded or failed
  if (response.grounding && (!response.grounding.isGrounded || response.grounding.remedyAction === 'DOWNGRADE')) {
    return false;
  }

  // Must have verified evidence or traceable citations
  const hasAcceptedEvidence =
    (response.evidence &&
      response.evidence.some(
        (e) => e.verificationStatus === 'SUPPORTED' || e.verificationStatus === 'PARTIAL'
      )) ||
    (response.citations && response.citations.length > 0);

  if (!hasAcceptedEvidence) {
    return false;
  }

  return response.status === 'ANSWERED' || response.status === 'PARTIAL';
}

export function toInteractionRecord(res: AskResponse, defaultSessionId: string): InteractionRecord {
  const eligible = isEligibleForAssessment(res);
  const topic = res.understanding?.topic?.trim() || res.understanding?.category?.trim() || 'عام';
  const category = res.understanding?.category?.trim() || 'عام';

  let verificationStatus = 'UNSUPPORTED';
  if (res.evidence && res.evidence.some((e) => e.verificationStatus === 'SUPPORTED')) {
    verificationStatus = 'SUPPORTED';
  } else if (res.evidence && res.evidence.some((e) => e.verificationStatus === 'PARTIAL')) {
    verificationStatus = 'PARTIAL';
  }

  return {
    interactionId: res.interactionId,
    sessionId: res.sessionId || defaultSessionId,
    question: res.question,
    origin: res.origin || 'USER',
    parentInteractionId: res.parentInteractionId,
    category,
    topic,
    answerStatus: res.status,
    verificationStatus,
    createdAt: res.createdAt || new Date().toISOString(),
    verifiedKnowledgeEligible: eligible,
    eligibleForAssessment: eligible,
    citations: res.citations,
    understanding: res.understanding,
  };
}

export class KnowledgeJourneyService {
  constructor(private storage = interactionStorage) {}

  async getJourney(sessionId: string): Promise<JourneyDashboardData> {
    const rawList = this.storage.getBySession(sessionId);
    const interactions = rawList.map((res) => toInteractionRecord(res, sessionId));

    const eligibleCount = interactions.filter((i) => i.eligibleForAssessment).length;
    const target = 20;
    const remaining = Math.max(0, target - eligibleCount);
    const assessmentUnlocked = eligibleCount >= target;

    const directQuestionCount = interactions.filter((i) => i.origin === 'USER').length;
    const deepLearningQuestionCount = interactions.filter((i) => i.origin === 'DEEP_LEARNING').length;

    const domainDistribution: Record<string, number> = {
      'العقيدة': 0,
      'الفقه': 0,
      'الحديث': 0,
      'التفسير': 0,
      'موضوعات إسلامية عامة': 0,
    };

    for (const item of interactions) {
      const cat = item.category || 'موضوعات إسلامية عامة';
      domainDistribution[cat] = (domainDistribution[cat] || 0) + 1;
    }

    return {
      sessionId,
      interactions,
      allInteractions: interactions,
      eligibleCount,
      target,
      remaining,
      assessmentUnlocked,
      directQuestionCount,
      deepLearningQuestionCount,
      verifiedKnowledgeCount: eligibleCount,
      assessmentEligibility: {
        status: assessmentUnlocked ? 'READY' : 'LOCKED',
        requiredCount: target,
        currentCount: eligibleCount,
        progressPercentage: Math.min(100, Math.round((eligibleCount / target) * 100)),
      },
      domainDistribution,
      originDistribution: {
        USER: directQuestionCount,
        DEEP_LEARNING: deepLearningQuestionCount,
      },
    };
  }
}
