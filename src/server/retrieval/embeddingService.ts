import fs from 'fs';
import path from 'path';
import { config } from '../config/config.js';
import { KnowledgeChunk } from '../../shared/types/index.js';

export interface EmbeddingCacheData {
  model: string;
  embeddings: Record<string, number[]>;
}

export class EmbeddingService {
  private apiKey: string;
  private model: string;
  private cacheFilePath: string;
  private cache: Map<string, number[]> = new Map();
  private available: boolean = false;

  constructor(options?: {
    apiKey?: string;
    model?: string;
    cacheFilePath?: string;
  }) {
    this.apiKey = options?.apiKey ?? config.gemini.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.model = options?.model ?? config.gemini.embeddingModel ?? 'gemini-embedding-001';
    this.cacheFilePath =
      options?.cacheFilePath ??
      path.resolve(process.cwd(), 'data', 'knowledge', 'embeddings_cache.json');

    this.available = Boolean(this.apiKey && this.apiKey.trim().length > 0);
    this.loadCache();
  }

  public isAvailable(): boolean {
    return this.available;
  }

  public getModelName(): string {
    return this.model;
  }

  public getCachedCount(): number {
    return this.cache.size;
  }

  private loadCache(): void {
    if (!fs.existsSync(this.cacheFilePath)) {
      return;
    }

    try {
      const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
      const data = JSON.parse(raw) as EmbeddingCacheData;
      if (data && typeof data.embeddings === 'object') {
        for (const [hash, vec] of Object.entries(data.embeddings)) {
          if (Array.isArray(vec)) {
            this.cache.set(hash, vec);
          }
        }
      }
    } catch {
      // In case of corrupt file, start fresh
    }
  }

  private persistCache(): void {
    try {
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const obj: Record<string, number[]> = {};
      for (const [hash, vec] of this.cache.entries()) {
        obj[hash] = vec;
      }

      const payload: EmbeddingCacheData = {
        model: this.model,
        embeddings: obj,
      };

      fs.writeFileSync(this.cacheFilePath, JSON.stringify(payload), 'utf-8');
    } catch (err) {
      console.warn('Failed to persist embeddings cache:', err);
    }
  }

  /**
   * Computes cosine similarity between two vectors.
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    // Clamp to [0, 1] for semantic scoring
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Generate embedding for a single text string.
   */
  async embedText(text: string): Promise<number[] | null> {
    if (!this.available || !text.trim()) {
      return null;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:embedContent?key=${encodeURIComponent(this.apiKey)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: text.trim() }] },
        }),
      });

      if (!response.ok) {
        console.warn(`Embedding API returned status ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        embedding?: { values?: number[] };
      };

      if (data.embedding?.values && Array.isArray(data.embedding.values)) {
        return data.embedding.values;
      }

      return null;
    } catch (err) {
      console.warn('Failed to embed text:', err);
      return null;
    }
  }

  /**
   * Pre-embeds chunks and populates cache.
   */
  async ensureChunksEmbedded(chunks: KnowledgeChunk[]): Promise<Map<string, number[]>> {
    const chunkVectors = new Map<string, number[]>();
    if (chunks.length === 0) return chunkVectors;

    const missingChunks: KnowledgeChunk[] = [];

    for (const chunk of chunks) {
      const cached = this.cache.get(chunk.contentHash);
      if (cached) {
        chunkVectors.set(chunk.chunkId, cached);
      } else {
        missingChunks.push(chunk);
      }
    }

    if (missingChunks.length === 0 || !this.available) {
      return chunkVectors;
    }

    // Embed missing chunks in batches of 20 with backoff on 429
    const batchSize = 20;
    let cacheUpdated = false;

    for (let i = 0; i < missingChunks.length; i += batchSize) {
      const batch = missingChunks.slice(i, i + batchSize);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        this.model
      )}:batchEmbedContents?key=${encodeURIComponent(this.apiKey)}`;

      let attempts = 0;
      let success = false;

      while (attempts < 3 && !success) {
        attempts++;
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: batch.map((c) => ({
                model: `models/${this.model}`,
                content: { parts: [{ text: `${c.title}\n${c.text}`.substring(0, 2048) }] },
              })),
            }),
          });

          if (response.status === 429) {
            console.warn(`Batch embed rate limit (429) hit, waiting 3s (attempt ${attempts})...`);
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }

          if (!response.ok) {
            console.warn(`Batch embed returned ${response.status}`);
            break;
          }

          const data = (await response.json()) as {
            embeddings?: Array<{ values?: number[] }>;
          };

          if (data.embeddings && Array.isArray(data.embeddings)) {
            data.embeddings.forEach((emb, idx) => {
              const chunk = batch[idx];
              if (chunk && emb.values) {
                this.cache.set(chunk.contentHash, emb.values);
                chunkVectors.set(chunk.chunkId, emb.values);
                cacheUpdated = true;
              }
            });
            success = true;
          }
        } catch (err) {
          console.warn('Error during batch embedding:', err);
        }
      }

      // Small delay between successful batches
      if (success) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (cacheUpdated) {
      this.persistCache();
    }

    return chunkVectors;
  }

  /**
   * Scores all chunks with known embeddings against a query vector.
   */
  scoreChunksWithVector(
    queryVector: number[],
    chunkVectors: Map<string, number[]>
  ): Map<string, number> {
    const scores = new Map<string, number>();

    for (const [chunkId, vec] of chunkVectors.entries()) {
      const sim = EmbeddingService.cosineSimilarity(queryVector, vec);
      scores.set(chunkId, Number(sim.toFixed(4)));
    }

    return scores;
  }
}
