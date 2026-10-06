import { KnowledgeDocument } from '../../shared/types/index.js';

export interface IKnowledgeDocumentRepository {
  getDocumentById(documentId: string): Promise<KnowledgeDocument | null>;
  getDocumentsBySourceId(sourceId: string): Promise<KnowledgeDocument[]>;
  addDocument(doc: KnowledgeDocument): Promise<void>;
}
