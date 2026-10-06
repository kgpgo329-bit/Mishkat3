import { QuestionOrigin, QuestionUnderstandingResult } from './question.js';
import { InteractionStatus, AnswerCitation } from './answer.js';

export interface InteractionRecord {
  interactionId: string;
  sessionId: string;
  question: string;
  origin: QuestionOrigin;
  parentInteractionId?: string;
  category?: string;
  topic: string;
  answerStatus: InteractionStatus;
  verificationStatus?: string;
  createdAt: string; // ISO 8601
  verifiedKnowledgeEligible?: boolean;
  eligibleForAssessment: boolean;
  citations?: AnswerCitation[];
  understanding?: QuestionUnderstandingResult;
}

export interface VerifiedKnowledgeRecord {
  recordId: string;
  interactionId: string;
  sessionId: string;
  topic: string;
  category: string;
  keyClaims: string[];
  verifiedEvidenceCount: number;
  verifiedAt: string;
}

export interface JourneyDashboardData {
  sessionId: string;
  interactions: InteractionRecord[];
  allInteractions: InteractionRecord[];
  eligibleCount: number;
  target: number;
  remaining: number;
  assessmentUnlocked: boolean;
  directQuestionCount: number;
  deepLearningQuestionCount: number;
  verifiedKnowledgeCount: number;
  assessmentEligibility: {
    status: 'LOCKED' | 'READY';
    requiredCount: number;
    currentCount: number;
    progressPercentage: number;
  };
  domainDistribution: Record<string, number>;
  originDistribution: {
    USER: number;
    DEEP_LEARNING: number;
  };
}
