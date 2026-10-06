export type SourceIngestionStatus = 'INGESTED' | 'REGISTERED_NOT_INGESTED';

export interface TrustedSource {
  sourceId: string;
  name: string;
  author: string;
  era?: string;
  category: string;
  description: string;
  officialUrl?: string;
  isVerified: boolean;
  status?: SourceIngestionStatus;
  documentCount?: number;
  chunkCount?: number;
  statusNote?: string;
}

export interface KnowledgeDocument {
  documentId: string;
  sourceId: string;
  title: string;
  author: string;
  category: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeChunk {
  chunkId: string;
  sourceId: string;
  documentId: string;
  text: string;
  title: string;
  category: string;
  officialUrl?: string;
  metadata?: Record<string, unknown>;
  contentHash: string;
}
