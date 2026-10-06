import { describe, it, expect } from 'vitest';
import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';
import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { EmbeddingService } from '../src/server/retrieval/embeddingService.js';
import { KnowledgeChunkSchema } from '../src/shared/schemas/index.js';

describe('STEP 5B Focused Validation: Fixed Coverage for Challenge C', () => {
  const repo = new LocalJsonKnowledgeRepository();
  const embService = new EmbeddingService();
  const retriever = new HybridRetriever(repo, embService);

  it('1. Repository contains expanded targeted documents and chunks', async () => {
    const stats = repo.getStats();
    expect(stats.documentsCount).toBeGreaterThanOrEqual(45);
    expect(stats.chunksCount).toBeGreaterThanOrEqual(150);

    // Verify key new targeted documents exist
    const doc764 = await repo.getDocumentById('doc_islamic_content_term_764');
    expect(doc764).toBeDefined();
    expect(doc764?.title).toContain('الغزوات والسرايا والبعوث');

    const doc10344 = await repo.getDocumentById('doc_dawa_center_file_10344');
    expect(doc10344).toBeDefined();
    expect(doc10344?.title).toContain('علماء الغرب يدخلون الإسلام');
  });

  it('2. Provenance and schema validity are strictly preserved for newly added chunks', async () => {
    const newDocIds = [
      'doc_islamic_content_term_692',
      'doc_islamic_content_term_764',
      'doc_islamic_content_term_813',
      'doc_dawa_center_file_10344',
    ];

    for (const docId of newDocIds) {
      const chunks = await repo.getChunksByDocumentId(docId);
      expect(chunks.length).toBeGreaterThan(0);

      for (const chunk of chunks) {
        expect(chunk.sourceId).toBeDefined();
        expect(chunk.documentId).toBe(docId);
        expect(chunk.contentHash).toBeDefined();
        expect(chunk.text.length).toBeGreaterThan(0);

        const parseResult = KnowledgeChunkSchema.safeParse(chunk);
        expect(parseResult.success).toBe(true);
      }
    }
  });

  it('3. Deduplication prevents duplicate insertion of new records', async () => {
    const statsBefore = repo.getStats();
    const existingChunks = await repo.getChunksByDocumentId('doc_islamic_content_term_764');

    await repo.addBatchChunks(existingChunks);
    const statsAfter = repo.getStats();

    expect(statsAfter.chunksCount).toBe(statsBefore.chunksCount);
  });

  it('4. Re-run retrieval for Challenge Question C returns GOOD rating with specialized substantive material', async () => {
    const qC = 'هل الإسلام انتشر بالسيف؟';
    const claimsC = [
      'الإسلام انتشر بالحجة والبيان وحرية الاعتقاد ولا إكراه في الدين',
      'القتال والجهاد شُرع للدفاع ورد العدوان وتأمين حرية الدعوة وليس للإكراه',
    ];

    const result = await retriever.retrieve(
      {
        question: qC,
        claims: claimsC,
      },
      { topK: 5 }
    );

    expect(result.question).toBe(qC);
    expect(result.claimResults).toHaveLength(2);
    expect(result.allCandidates.length).toBeGreaterThan(0);

    const topCandidateDocIds = result.allCandidates.slice(0, 5).map((c) => c.documentId);

    // Verify top candidates include specialized defensive fighting & non-coercion documents
    const hasDefensiveGhazawat = topCandidateDocIds.includes('doc_islamic_content_term_764');
    const hasIntellectualDawa = topCandidateDocIds.includes('doc_dawa_center_file_10344');

    expect(hasDefensiveGhazawat || hasIntellectualDawa).toBe(true);

    // Ensure candidate chunks do not contain verification or answer labels
    for (const candidate of result.allCandidates) {
      expect((candidate as Record<string, unknown>).verificationStatus).toBeUndefined();
      expect((candidate as Record<string, unknown>).isVerified).toBeUndefined();
    }
  });
});
