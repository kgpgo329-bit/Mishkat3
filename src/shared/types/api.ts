import { AskRequest, AskResponse } from './answer.js';
import { DeepLearningResponse } from './deepLearning.js';
import { JourneyDashboardData, InteractionRecord } from './journey.js';
import {
  AssessmentEligibilityInfo,
  AssessmentClientView,
  AssessmentSubmissionRequest,
  AssessmentSubmissionResult
} from './assessment.js';
import { FinalReportRecord } from './report.js';
import { TrustedSource } from './knowledge.js';
import { SpecialistReferralResponse } from './specialist.js';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface IMishkatApiClient {
  askQuestion(req: AskRequest): Promise<ApiResponse<AskResponse>>;
  getInteraction(id: string): Promise<ApiResponse<AskResponse>>;
  getJourney(sessionId?: string): Promise<ApiResponse<JourneyDashboardData>>;
  getDeepLearning(interactionId: string): Promise<ApiResponse<DeepLearningResponse>>;
  getAssessmentStatus(sessionId?: string): Promise<ApiResponse<AssessmentEligibilityInfo>>;
  generateAssessment(sessionId?: string): Promise<ApiResponse<AssessmentClientView>>;
  submitAssessment(id: string, answers: AssessmentSubmissionRequest): Promise<ApiResponse<AssessmentSubmissionResult>>;
  getReport(sessionId?: string): Promise<ApiResponse<FinalReportRecord>>;
  getSources(): Promise<ApiResponse<TrustedSource[]>>;
  getSpecialistReferral(): Promise<ApiResponse<SpecialistReferralResponse>>;
}
