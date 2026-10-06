import { FinalReportRecord } from '../../shared/types/index.js';
import { IReportStorage } from './IReportStorage.js';

export class InMemoryReportStorage implements IReportStorage {
  private reports = new Map<string, FinalReportRecord>();

  async saveReport(report: FinalReportRecord): Promise<void> {
    this.reports.set(report.reportId, report);
  }

  set(report: FinalReportRecord): void {
    this.reports.set(report.reportId, report);
  }

  async getReportById(sessionId: string, reportId: string): Promise<FinalReportRecord | null> {
    const rep = this.reports.get(reportId);
    if (!rep || rep.sessionId !== sessionId) {
      return null;
    }
    return rep;
  }

  get(reportId: string): FinalReportRecord | null {
    return this.reports.get(reportId) || null;
  }

  async getLatestReport(sessionId: string): Promise<FinalReportRecord | null> {
    const sessionReports: FinalReportRecord[] = [];
    for (const r of this.reports.values()) {
      if (r.sessionId === sessionId) {
        sessionReports.push(r);
      }
    }
    if (sessionReports.length === 0) {
      return null;
    }
    sessionReports.sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
    return sessionReports[0];
  }

  getByAssessmentId(assessmentId: string): FinalReportRecord | null {
    for (const r of this.reports.values()) {
      if (r.assessmentId === assessmentId) {
        return r;
      }
    }
    return null;
  }

  clear(): void {
    this.reports.clear();
  }
}

export const reportStorage = new InMemoryReportStorage();
