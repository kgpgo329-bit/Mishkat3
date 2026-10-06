import {
  QuestionUnderstandingResult,
  EvidenceVerificationResult,
  SufficiencyEvaluation,
  GroundingValidationResult,
  FollowUpQuestion,
  KnowledgeChunk,
  VerifiedKnowledgeRecord,
  InteractionRecord,
  AssessmentRecord,
  FinalReportRecord
} from '../../shared/types/index.js';

export interface UnderstandQuestionParams {
  question: string;
  categoryHint?: string;
}

export interface VerifyEvidenceParams {
  claim: string;
  candidateChunk: KnowledgeChunk;
  claimId?: string;
}

export interface GenerateGroundedAnswerParams {
  question: string;
  understanding?: QuestionUnderstandingResult;
  verifiedEvidence: EvidenceVerificationResult[];
  chunks: KnowledgeChunk[];
}

export interface GroundedAnswerResult {
  answer: string;
  citedChunkIds: string[];
  inferredClaims: string[];
}

export interface ValidateGroundingParams {
  answer: string;
  acceptedEvidence?: EvidenceVerificationResult[];
  chunks: KnowledgeChunk[];
}

export interface GenerateFollowUpsParams {
  originalQuestion: string;
  groundedAnswer: string;
  parentInteractionId: string;
  category?: string;
  topic?: string;
  keyClaims?: string[];
  verifiedClaims?: string[];
  verifiedEvidenceExcerpts?: Array<{ title?: string; sourceName?: string; content: string }>;
}

export interface GenerateAssessmentParams {
  sessionId: string;
  eligibleInteractions?: InteractionRecord[];
  verifiedRecords?: VerifiedKnowledgeRecord[];
  questionCount?: number;
}

export interface GenerateReportParams {
  sessionId: string;
  assessmentRecord: AssessmentRecord;
  eligibleInteractions?: InteractionRecord[];
  verifiedRecords?: VerifiedKnowledgeRecord[];
  assessmentScorePercentage?: number;
  reportId?: string;
}

/**
 * Canonical AI Provider abstraction for Mishkat.
 * Centralizes all AI operations (Gemini).
 * In Step 1, this interface is defined without live Gemini implementation.
 */
export interface AIProvider {
  understandQuestion(params: UnderstandQuestionParams): Promise<QuestionUnderstandingResult>;
  verifyEvidence(params: VerifyEvidenceParams): Promise<EvidenceVerificationResult>;
  generateGroundedAnswer(params: GenerateGroundedAnswerParams): Promise<GroundedAnswerResult>;
  validateGrounding(params: ValidateGroundingParams): Promise<GroundingValidationResult>;
  generateFollowUps(params: GenerateFollowUpsParams): Promise<FollowUpQuestion[]>;
  generateAssessment(params: GenerateAssessmentParams): Promise<AssessmentRecord>;
  generateReport(params: GenerateReportParams): Promise<FinalReportRecord>;
}
