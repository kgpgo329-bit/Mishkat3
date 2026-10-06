export type DeepLearningType =
  | 'دليل أعمق'
  | 'مفهوم مرتبط'
  | 'مقارنة'
  | 'أثر المسألة'
  | 'سؤال تحليلي'
  | string;

export interface FollowUpQuestion {
  id: string;
  question: string;
  type?: DeepLearningType;
  origin: 'DEEP_LEARNING';
  parentInteractionId: string;
}

export interface DeepLearningResponse {
  parentInteractionId: string;
  topic: string;
  followUps: FollowUpQuestion[];
}
