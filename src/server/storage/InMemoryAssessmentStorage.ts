import { AssessmentRecord } from '../../shared/types/index.js';

class InMemoryAssessmentStorage {
  private store = new Map<string, AssessmentRecord>();

  set(id: string, record: AssessmentRecord): void {
    this.store.set(id, record);
  }

  get(id: string): AssessmentRecord | null {
    return this.store.get(id) || null;
  }

  getBySession(sessionId: string): AssessmentRecord[] {
    const list: AssessmentRecord[] = [];
    for (const rec of this.store.values()) {
      if (rec.sessionId === sessionId) {
        list.push(rec);
      }
    }
    return list;
  }

  getLatestCompletedBySession(sessionId: string): AssessmentRecord | null {
    const completed = this.getBySession(sessionId).filter(
      (a) => a.status === 'COMPLETED' && typeof a.score === 'number'
    );
    if (completed.length === 0) return null;
    return completed[completed.length - 1];
  }

  clear(): void {
    this.store.clear();
  }
}

export const assessmentStorage = new InMemoryAssessmentStorage();
