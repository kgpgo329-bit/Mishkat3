import {
  TrustedSource,
  KnowledgeDocument,
  KnowledgeChunk,
} from '../../../shared/types/index.js';

export type IngestionStatus = 'INGESTED' | 'REGISTERED_NOT_INGESTED';

export interface IngestionResult {
  source: TrustedSource;
  status: IngestionStatus;
  reason?: string;
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
}

export interface ISourceAdapter {
  sourceId: string;
  getSourceDefinition(): TrustedSource;
  ingestSample(): Promise<IngestionResult>;
}
