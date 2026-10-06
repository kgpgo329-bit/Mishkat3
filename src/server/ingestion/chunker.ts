import { KnowledgeChunk } from '../../shared/types/index.js';
import { generateContentHash } from './hasher.js';

export interface ChunkOptions {
  minChunkLength?: number;
  maxChunkLength?: number;
  targetChunkLength?: number;
}

export interface DocumentProvenance {
  documentId: string;
  sourceId: string;
  sourceName: string;
  officialUrl?: string;
  category: string;
  title: string;
  locatorMetadata?: Record<string, unknown>;
}

export function chunkDocumentText(
  rawText: string,
  provenance: DocumentProvenance,
  options?: ChunkOptions
): KnowledgeChunk[] {
  const minLength = options?.minChunkLength || 60;
  const maxLength = options?.maxChunkLength || 800;

  if (!rawText || rawText.trim().length < minLength) {
    if (rawText && rawText.trim().length > 0) {
      // Single chunk if small but present
      const text = rawText.trim();
      const contentHash = generateContentHash(text);
      return [
        {
          chunkId: `chk_${provenance.documentId}_0`,
          documentId: provenance.documentId,
          sourceId: provenance.sourceId,
          title: provenance.title,
          category: provenance.category,
          officialUrl: provenance.officialUrl,
          text,
          contentHash,
          metadata: {
            sourceName: provenance.sourceName,
            ...provenance.locatorMetadata,
          },
        },
      ];
    }
    return [];
  }

  // Split by double newlines (paragraphs) first
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: KnowledgeChunk[] = [];
  let currentBuffer = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if (currentBuffer.length + para.length > maxLength && currentBuffer.length >= minLength) {
      const text = currentBuffer.trim();
      const contentHash = generateContentHash(text);
      chunks.push({
        chunkId: `chk_${provenance.documentId}_${chunkIndex++}`,
        documentId: provenance.documentId,
        sourceId: provenance.sourceId,
        title: provenance.title,
        category: provenance.category,
        officialUrl: provenance.officialUrl,
        text,
        contentHash,
        metadata: {
          sourceName: provenance.sourceName,
          ...provenance.locatorMetadata,
        },
      });
      currentBuffer = '';
    }

    if (currentBuffer.length > 0) {
      currentBuffer += '\n\n' + para;
    } else {
      currentBuffer = para;
    }
  }

  if (currentBuffer.trim().length >= minLength) {
    const text = currentBuffer.trim();
    const contentHash = generateContentHash(text);
    chunks.push({
      chunkId: `chk_${provenance.documentId}_${chunkIndex++}`,
      documentId: provenance.documentId,
      sourceId: provenance.sourceId,
      title: provenance.title,
      category: provenance.category,
      officialUrl: provenance.officialUrl,
      text,
      contentHash,
      metadata: {
        sourceName: provenance.sourceName,
        ...provenance.locatorMetadata,
      },
    });
  }

  return chunks;
}
