import { VerifiedKnowledgeRecord } from '../../shared/types/index.js';

export interface IVerifiedKnowledgeStorage {
  saveVerifiedRecord(record: VerifiedKnowledgeRecord): Promise<void>;
  getVerifiedRecordsBySession(sessionId: string): Promise<VerifiedKnowledgeRecord[]>;
  getVerifiedCountBySession(sessionId: string): Promise<number>;
}
