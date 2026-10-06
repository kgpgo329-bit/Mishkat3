import { FinalReportRecord } from '../../shared/types/index.js';
import { IReportStorage } from './IReportStorage.js';
import { getFirestoreDb } from '../config/firebase.js';
import { doc, setDoc } from 'firebase/firestore';

export class InMemoryReportStorage implements IReportStorage {
  private reports = new Map<string, FinalReportRecord>();

  private syncToFirestore(report: FinalReportRecord): void {
    try {
      const db = getFirestoreDb();
      const docRef = doc(db, 'reports', report.reportId);
      const cleanData = JSON.parse(JSON.stringify(report));
      setDoc(docRef, cleanData).catch((err) => {
        console.warn(`[Firestore] Sync report ${report.reportId} warning:`, err?.message || err);
      });
    } catch (e: any) {
      console.warn(`[Firestore] Report store initialization warning:`, e?.message || e);
    }
  }

  async saveReport(report: FinalReportRecord): Promise<void> {
    this.reports.set(report.reportId, report);
    this.syncToFirestore(report);
  }

  set(report: FinalReportRecord): void {
    this.reports.set(report.reportId, report);
    this.syncToFirestore(report);
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
