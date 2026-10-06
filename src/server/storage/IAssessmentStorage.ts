import { AssessmentRecord } from '../../shared/types/index.js';

export interface IAssessmentStorage {
  saveAssessment(assessment: AssessmentRecord): Promise<void>;
  getAssessmentById(sessionId: string, assessmentId: string): Promise<AssessmentRecord | null>;
  getLatestAssessment(sessionId: string): Promise<AssessmentRecord | null>;
  updateAssessment(sessionId: string, assessmentId: string, updates: Partial<AssessmentRecord>): Promise<void>;
}
