import fs from 'fs';
import path from 'path';
import {
  TrustedSource,
  KnowledgeDocument,
  KnowledgeChunk,
} from '../../shared/types/index.js';
import {
  ITrustedSourceRepository,
} from './ITrustedSourceRepository.js';
import {
  IKnowledgeDocumentRepository,
} from './IKnowledgeDocumentRepository.js';
import {
  IKnowledgeChunkRepository,
  ChunkSearchParams,
} from './IKnowledgeChunkRepository.js';

export interface LocalRepositoryConfig {
  dataDir?: string;
}

export class LocalJsonKnowledgeRepository
  implements
    ITrustedSourceRepository,
    IKnowledgeDocumentRepository,
    IKnowledgeChunkRepository
{
  private dataDir: string;
  private sourcesFile: string;
  private documentsFile: string;
  private chunksFile: string;

  private sourcesCache: Map<string, TrustedSource> = new Map();
  private documentsCache: Map<string, KnowledgeDocument> = new Map();
  private chunksCache: Map<string, KnowledgeChunk> = new Map();
  private hashToChunkId: Map<string, string> = new Map();

  constructor(config?: LocalRepositoryConfig) {
    this.dataDir = config?.dataDir || path.resolve(process.cwd(), 'data', 'knowledge');
    this.sourcesFile = path.join(this.dataDir, 'sources.json');
    this.documentsFile = path.join(this.dataDir, 'documents.json');
    this.chunksFile = path.join(this.dataDir, 'chunks.json');
    this.initStorage();
  }

  private initStorage(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.sourcesFile)) {
      try {
        const raw = fs.readFileSync(this.sourcesFile, 'utf-8');
        const items = JSON.parse(raw) as TrustedSource[];
        for (const item of items) {
          this.sourcesCache.set(item.sourceId, item);
        }
      } catch {
        // Init empty if file corrupt
      }
    }

    if (fs.existsSync(this.documentsFile)) {
      try {
        const raw = fs.readFileSync(this.documentsFile, 'utf-8');
        const items = JSON.parse(raw) as KnowledgeDocument[];
        for (const item of items) {
          this.documentsCache.set(item.documentId, item);
        }
      } catch {
        // Init empty
      }
    }

    if (fs.existsSync(this.chunksFile)) {
      try {
        const raw = fs.readFileSync(this.chunksFile, 'utf-8');
        const items = JSON.parse(raw) as KnowledgeChunk[];
        for (const item of items) {
          this.chunksCache.set(item.chunkId, item);
          this.hashToChunkId.set(item.contentHash, item.chunkId);
        }
      } catch {
        // Init empty
      }
    }
  }

  private persistSources(): void {
    const list = Array.from(this.sourcesCache.values());
    fs.writeFileSync(this.sourcesFile, JSON.stringify(list, null, 2), 'utf-8');
  }

  private persistDocuments(): void {
    const list = Array.from(this.documentsCache.values());
    fs.writeFileSync(this.documentsFile, JSON.stringify(list, null, 2), 'utf-8');
  }

  private persistChunks(): void {
    const list = Array.from(this.chunksCache.values());
    fs.writeFileSync(this.chunksFile, JSON.stringify(list, null, 2), 'utf-8');
  }

  // --- ITrustedSourceRepository ---
  async getAllSources(): Promise<TrustedSource[]> {
    return Array.from(this.sourcesCache.values());
  }

  async getSourceById(sourceId: string): Promise<TrustedSource | null> {
    return this.sourcesCache.get(sourceId) || null;
  }

  async getSourcesByCategory(category: string): Promise<TrustedSource[]> {
    return Array.from(this.sourcesCache.values()).filter((s) => s.category === category);
  }

  async addSource(source: TrustedSource): Promise<void> {
    this.sourcesCache.set(source.sourceId, source);
    this.persistSources();
  }

  // --- IKnowledgeDocumentRepository ---
  async getDocumentById(documentId: string): Promise<KnowledgeDocument | null> {
    return this.documentsCache.get(documentId) || null;
  }

  async getDocumentsBySourceId(sourceId: string): Promise<KnowledgeDocument[]> {
    return Array.from(this.documentsCache.values()).filter((d) => d.sourceId === sourceId);
  }

  async addDocument(doc: KnowledgeDocument): Promise<void> {
    this.documentsCache.set(doc.documentId, doc);
    this.persistDocuments();
  }

  // --- IKnowledgeChunkRepository ---
  async getChunkById(chunkId: string): Promise<KnowledgeChunk | null> {
    return this.chunksCache.get(chunkId) || null;
  }

  async getChunksByDocumentId(documentId: string): Promise<KnowledgeChunk[]> {
    return Array.from(this.chunksCache.values()).filter((c) => c.documentId === documentId);
  }

  async searchChunks(params: ChunkSearchParams): Promise<KnowledgeChunk[]> {
    const limit = params.limit || 10;
    const query = params.query.toLowerCase();
    const results: KnowledgeChunk[] = [];

    for (const chunk of this.chunksCache.values()) {
      if (params.category && chunk.category !== params.category) {
        continue;
      }
      if (chunk.text.toLowerCase().includes(query) || chunk.title.toLowerCase().includes(query)) {
        results.push(chunk);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  async addChunk(chunk: KnowledgeChunk): Promise<void> {
    // Content hash deduplication check
    if (this.hashToChunkId.has(chunk.contentHash)) {
      return; // Skip duplicate
    }
    this.chunksCache.set(chunk.chunkId, chunk);
    this.hashToChunkId.set(chunk.contentHash, chunk.chunkId);
    this.persistChunks();
  }

  async addBatchChunks(chunks: KnowledgeChunk[]): Promise<void> {
    let addedAny = false;
    for (const chunk of chunks) {
      if (!this.hashToChunkId.has(chunk.contentHash)) {
        this.chunksCache.set(chunk.chunkId, chunk);
        this.hashToChunkId.set(chunk.contentHash, chunk.chunkId);
        addedAny = true;
      }
    }
    if (addedAny) {
      this.persistChunks();
    }
  }

  // Helper inspection methods
  getStats(): { sourcesCount: number; documentsCount: number; chunksCount: number } {
    return {
      sourcesCount: this.sourcesCache.size,
      documentsCount: this.documentsCache.size,
      chunksCount: this.chunksCache.size,
    };
  }

  hasChunkHash(hash: string): boolean {
    return this.hashToChunkId.has(hash);
  }
}
