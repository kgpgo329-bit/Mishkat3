import { KnowledgeChunk } from '../../shared/types/index.js';

export interface ChunkSearchParams {
  query: string;
  category?: string;
  limit?: number;
  embedding?: number[];
}

export interface IKnowledgeChunkRepository {
  getChunkById(chunkId: string): Promise<KnowledgeChunk | null>;
  getChunksByDocumentId(documentId: string): Promise<KnowledgeChunk[]>;
  searchChunks(params: ChunkSearchParams): Promise<KnowledgeChunk[]>;
  addChunk(chunk: KnowledgeChunk): Promise<void>;
  addBatchChunks(chunks: KnowledgeChunk[]): Promise<void>;
}
