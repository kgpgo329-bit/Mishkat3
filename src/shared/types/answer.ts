import { QuestionOrigin, QuestionUnderstandingResult } from './question.js';
import { EvidenceVerificationResult, SufficiencyEvaluation } from './evidence.js';
import { TrustedSource } from './knowledge.js';
import { FollowUpQuestion } from './deepLearning.js';
import { CandidateChunk, QuestionRetrievalResult } from './retrieval.js';
import { SpecialistReferralInfo } from './specialist.js';

export type InteractionStatus =
  | 'ANSWERED'
  | 'SUFFICIENT'
  | 'PARTIAL'
  | 'INSUFFICIENT'
  | 'NEEDS_CLARIFICATION'
  | 'PERSONAL_FATWA'
  | 'SERVICE_ERROR'
  | 'NOT_IMPLEMENTED';

export interface GroundingValidationResult {
  isGrounded: boolean;
  unsupportedClaims: string[];
  remedyAction: 'ACCEPT' | 'RETRY' | 'DOWNGRADE';
}

export interface AskRequest {
  sessionId: string;
  question: string;
  category?: string;
  origin: QuestionOrigin;
  parentInteractionId?: string;
}

export interface AnswerCitation {
  sourceId: string;
  sourceName: string;
  officialUrl?: string;
  documentId: string;
  chunkId: string;
  title: string;
}

export interface AskResponse {
  interactionId: string;
  sessionId?: string;
  origin?: QuestionOrigin;
  parentInteractionId?: string;
  createdAt?: string;
  status: InteractionStatus;
  question: string;
  answer?: string;
  claims?: string[];
  evidence?: EvidenceVerificationResult[];
  candidates?: CandidateChunk[];
  retrieval?: QuestionRetrievalResult;
  sufficiency?: SufficiencyEvaluation;
  sources?: TrustedSource[];
  citations?: AnswerCitation[];
  grounding?: GroundingValidationResult;
  followUps?: FollowUpQuestion[];
  journeyState?: {
    totalInteractions: number;
    verifiedCount: number;
    assessmentEligible: boolean;
  };
  clarificationPrompt?: string;
  specialistReferral?: SpecialistReferralInfo;
  understanding?: QuestionUnderstandingResult;
}
