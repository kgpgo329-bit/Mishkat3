export type QuestionOrigin = 'USER' | 'DEEP_LEARNING';

export type QuestionCategory =
  | 'العقيدة'
  | 'الفقه'
  | 'الحديث'
  | 'التفسير'
  | 'موضوعات إسلامية عامة'
  | string;

export interface QuestionUnderstandingResult {
  originalQuestion: string;
  normalizedQuestion: string;
  category: QuestionCategory;
  task: string;
  topic: string;
  userGoal: string;
  claims: string[];
  requestedEvidence: string[];
  needsClarification: boolean;
  clarificationReason?: string;
  isPersonalFatwa: boolean;
}
