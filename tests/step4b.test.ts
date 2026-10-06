import { describe, it, expect } from 'vitest';
import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';
import { IngestionService } from '../src/server/ingestion/IngestionService.js';
import { KnowledgeChunkSchema } from '../src/shared/schemas/index.js';

describe('STEP 4B Focused Validation: Targeted Knowledge Coverage Expansion', () => {
  const repo = new LocalJsonKnowledgeRepository();
  const service = new IngestionService(repo);

  it('1. Repository contains between 30 and 60 real documents', async () => {
    const stats = repo.getStats();
    expect(stats.documentsCount).toBeGreaterThanOrEqual(30);
    expect(stats.documentsCount).toBeLessThanOrEqual(60);
    expect(stats.chunksCount).toBeGreaterThanOrEqual(100);
  });

  it('2. Provenance is strictly preserved for every single chunk', async () => {
    const summary = await service.generateSummary();
    expect(summary.provenanceVerified).toBe(true);

    const sources = await repo.getAllSources();
    for (const source of sources) {
      const docs = await repo.getDocumentsBySourceId(source.sourceId);
      for (const doc of docs) {
        expect(doc.sourceId).toBe(source.sourceId);
        expect(doc.title).toBeDefined();

        const chunks = await repo.getChunksByDocumentId(doc.documentId);
        for (const chunk of chunks) {
          expect(chunk.sourceId).toBe(source.sourceId);
          expect(chunk.documentId).toBe(doc.documentId);
          expect(chunk.contentHash).toBeDefined();
          expect(chunk.text.length).toBeGreaterThan(0);
          expect(chunk.metadata?.sourceName).toBeDefined();

          const validated = KnowledgeChunkSchema.safeParse(chunk);
          expect(validated.success).toBe(true);
        }
      }
    }
  });

  it('3. Deduplication guarantees re-running does not duplicate content', async () => {
    const statsBefore = repo.getStats();
    const allChunks = await repo.searchChunks({ query: '', limit: 10 });

    // Re-add existing chunks
    await repo.addBatchChunks(allChunks);

    const statsAfter = repo.getStats();
    expect(statsAfter.chunksCount).toBe(statsBefore.chunksCount);
  });

  it('4. Topic coverage summary is grounded without fabricated metrics', async () => {
    const summary = await service.generateSummary();
    expect(summary.topicCoverage.length).toBeGreaterThanOrEqual(8);

    for (const item of summary.topicCoverage) {
      expect(item.topic).toBeDefined();
      expect(item.documentCount).toBeGreaterThan(0);
      expect(item.chunkCount).toBeGreaterThan(0);
      expect(item.sourcesRepresented.length).toBeGreaterThan(0);
    }
  });

  it('5. Challenge readiness evaluates categories A through F', async () => {
    const summary = await service.generateSummary();
    const readiness = summary.challengeReadiness;

    expect(readiness.A).toBe('AVAILABLE'); // لماذا يعبد المسلمون الكعبة؟
    expect(readiness.B).toBe('AVAILABLE'); // هل القرآن من تأليف محمد ﷺ؟
    expect(readiness.C).toBe('AVAILABLE'); // هل الإسلام انتشر بالسيف؟
    expect(readiness.D).toBe('AVAILABLE'); // لماذا توجد أحكام مختلفة بين العلماء؟
    expect(readiness.E).toBe('AVAILABLE'); // معنى التوحيد
    expect(readiness.F).toBe('AVAILABLE'); // تفسير سورة الإخلاص
  });

  it('6. Dorar status remains registered_not_ingested with 403', async () => {
    const summary = await service.generateSummary();
    expect(summary.registeredNotIngested).toHaveLength(1);
    expect(summary.registeredNotIngested[0].sourceId).toBe('src_dorar');
    expect(summary.registeredNotIngested[0].reason).toContain('403');
  });
});
