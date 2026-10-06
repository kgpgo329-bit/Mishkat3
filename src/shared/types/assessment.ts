export type AssessmentStatus = 'LOCKED' | 'READY' | 'COMPLETED';

export interface AssessmentQuestionServer {
  id?: string;
  questionId: string;
  question: string;
  options: string[];
  correctOptionId?: number;
  correctAnswer: number; // 0-based index
  explanation: string;
  sourceInteractionIds?: string[];
  sourceRecordIds: string[];
}

export interface AssessmentQuestionClient {
  questionId: string;
  question: string;
  options: string[];
}

export interface AssessmentRecord {
  assessmentId: string;
  sessionId: string;
  basedOnRecordIds: string[];
  questions: AssessmentQuestionServer[];
  status: AssessmentStatus;
  createdAt: string;
  completedAt?: string;
  score?: number;
  totalQuestions?: number;
  userAnswers?: Record<string, number>;
  submissionResults?: Array<{
    questionId: string;
    isCorrect: boolean;
    correctOptionId: number;
    explanation: string;
    sourceInteractionIds: string[];
  }>;
}

export interface AssessmentClientView {
  assessmentId: string;
  sessionId: string;
  questions: AssessmentQuestionClient[];
  status: AssessmentStatus;
  totalQuestions: number;
}

export interface AssessmentSubmissionRequest {
  answers: Record<string, number>; // questionId -> selectedOptionIndex
}

export interface AssessmentSubmissionResult {
  assessmentId: string;
  sessionId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  results?: Array<{
    questionId: string;
    isCorrect: boolean;
    correctOptionId: number;
    explanation: string;
    sourceInteractionIds: string[];
  }>;
  conceptPerformance: Array<{
    questionId: string;
    isCorrect: boolean;
    explanation: string;
  }>;
  completedAt: string;
}

export interface AssessmentEligibilityInfo {
  status: 'LOCKED' | 'READY';
  requiredCount: number;
  currentCount: number;
  remainingCount: number;
}
