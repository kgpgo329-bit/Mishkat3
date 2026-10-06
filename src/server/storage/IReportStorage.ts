import { FinalReportRecord } from '../../shared/types/index.js';

export interface IReportStorage {
  saveReport(report: FinalReportRecord): Promise<void>;
  getReportById(sessionId: string, reportId: string): Promise<FinalReportRecord | null>;
  getLatestReport(sessionId: string): Promise<FinalReportRecord | null>;
}
