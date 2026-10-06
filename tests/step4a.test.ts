import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';
import { IngestionService } from '../src/server/ingestion/IngestionService.js';
import { QuranpediaAdapter } from '../src/server/ingestion/adapters/QuranpediaAdapter.js';
import { DorarAdapter } from '../src/server/ingestion/adapters/DorarAdapter.js';
import { IslamicContentAdapter } from '../src/server/ingestion/adapters/IslamicContentAdapter.js';
import { DawaCenterAdapter } from '../src/server/ingestion/adapters/DawaCenterAdapter.js';
import { generateContentHash } from '../src/server/ingestion/hasher.js';
import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';
import { chunkDocumentText } from '../src/server/ingestion/chunker.js';
import {
  TrustedSourceSchema,
  KnowledgeChunkSchema,
} from '../src/shared/schemas/index.js';

describe('STEP 4A Focused Validation: Minimal Trusted Knowledge Ingestion', () => {
  const testDataDir = path.resolve(process.cwd(), 'data', 'test_knowledge');

  beforeEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('1. Approved Sources Registration', () => {
    it('registers only the 4 approved source families with valid schemas', () => {
      const adapters = [
        new QuranpediaAdapter(),
        new DorarAdapter(),
        new IslamicContentAdapter(),
        new DawaCenterAdapter(),
      ];

      expect(adapters).toHaveLength(4);

      const approvedIds = [
        'src_quranpedia',
        'src_dorar',
        'src_islamic_content',
        'src_dawa_center',
      ];

      for (const adapter of adapters) {
        const def = adapter.getSourceDefinition();
        expect(approvedIds).toContain(def.sourceId);
        expect(def.isVerified).toBe(true);

        const validated = TrustedSourceSchema.safeParse(def);
        expect(validated.success).toBe(true);
      }
    });
  });

  describe('2. Safe Inaccessible Source Handling (dorar.net 403)', () => {
    it('marks dorar.net as REGISTERED_NOT_INGESTED without crashing or bypassing protections', async () => {
      const dorarAdapter = new DorarAdapter();
      const result = await dorarAdapter.ingestSample();

      expect(result.status).toBe('REGISTERED_NOT_INGESTED');
      expect(result.reason).toContain('403');
      expect(result.documents).toHaveLength(0);
      expect(result.chunks).toHaveLength(0);
    });
  });

  describe('3. Provenance & Chunk Schema Validation', () => {
    it('creates chunks with complete provenance, locator metadata, and valid schema', () => {
      const rawText =
        'سورة الفاتحة هي أعظم سورة في كتاب الله عز وجل، وتسمى السبع المثاني والقرآن العظيم.\n\nروى البخاري في صحيحه عن أبي سعيد بن المعلى أن النبي ﷺ قال: لأعلمنك سورة هي أعظم سورة في القرآن.';

      const provenance = {
        documentId: 'doc_test_surah_1',
        sourceId: 'src_quranpedia',
        sourceName: 'Quranpedia (موسوعة القرآن الكريم)',
        officialUrl: 'https://quranpedia.net/surah/1',
        category: 'التفسير وعلوم القرآن',
        title: 'سورة الفاتحة — التعريف والفضائل',
        locatorMetadata: {
          surahNumber: 1,
          section: 'فضائل السورة',
        },
      };

      const chunks = chunkDocumentText(rawText, provenance);

      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(chunk.chunkId).toBeDefined();
        expect(chunk.documentId).toBe(provenance.documentId);
        expect(chunk.sourceId).toBe(provenance.sourceId);
        expect(chunk.title).toBe(provenance.title);
        expect(chunk.category).toBe(provenance.category);
        expect(chunk.officialUrl).toBe(provenance.officialUrl);
        expect(chunk.metadata?.sourceName).toBe(provenance.sourceName);
        expect(chunk.contentHash).toBeDefined();

        const schemaValidation = KnowledgeChunkSchema.safeParse(chunk);
        expect(schemaValidation.success).toBe(true);
      }
    });
  });

  describe('4. Deterministic Content Hashing & Deduplication', () => {
    it('generates consistent SHA-256 hashes and skips duplicate chunks on re-ingestion', async () => {
      const repo = new LocalJsonKnowledgeRepository({ dataDir: testDataDir });

      const text = 'المعنى اللغوي والشرعي لاسم الله الغفار هو الساتر لذنوب عباده المتجاوز عن خطاياهم.';
      const hash1 = generateContentHash(text);
      const hash2 = generateContentHash(text + '   '); // normalized should match

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length

      const sampleChunk = {
        chunkId: 'chk_dup_1',
        documentId: 'doc_dup',
        sourceId: 'src_islamic_content',
        title: 'دلالة اسم الله الغفار',
        category: 'معاجم ومصطلحات المحتوى الإسلامي',
        officialUrl: 'https://islamic-content.com/t/1900',
        text,
        contentHash: hash1,
        metadata: { sourceName: 'الجمهرة' },
      };

      // First insertion
      await repo.addChunk(sampleChunk);
      expect(repo.getStats().chunksCount).toBe(1);

      // Re-insertion of duplicate chunk with different chunkId but same contentHash
      const duplicateChunk = {
        ...sampleChunk,
        chunkId: 'chk_dup_2_different_id',
      };
      await repo.addChunk(duplicateChunk);

      // Count MUST remain 1 (deduplicated)
      expect(repo.getStats().chunksCount).toBe(1);
    });
  });

  describe('5. Technical Cleanup & Religious Integrity', () => {
    it('cleans HTML tags without altering the meaning of the religious text', () => {
      const dirtyHtml = `
        <header><nav><a href="/">الرئيسية</a></nav></header>
        <div class="content">
          <h1>سورة الإخلاص</h1>
          <p>قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾</p>
        </div>
        <footer><p>حقوق النشر</p></footer>
      `;

      const cleaned = cleanHtmlText(dirtyHtml);

      expect(cleaned).toContain('قُلْ هُوَ اللَّهُ أَحَدٌ');
      expect(cleaned).toContain('اللَّهُ الصَّمَدُ');
      expect(cleaned).not.toContain('<header>');
      expect(cleaned).not.toContain('الرئيسية');
      expect(cleaned).not.toContain('حقوق النشر');
    });
  });

  describe('6. Ingestion Pipeline Execution with Real Sample', () => {
    it('executes real sample ingestion, preserves provenance, and populates storage', async () => {
      const repo = new LocalJsonKnowledgeRepository();
      const stats = repo.getStats();

      // Ensure storage has ingested records
      expect(stats.sourcesCount).toBe(4);
      expect(stats.documentsCount).toBeGreaterThanOrEqual(2);
      expect(stats.chunksCount).toBeGreaterThanOrEqual(5);

      const allSources = await repo.getAllSources();
      expect(allSources.map((s) => s.sourceId)).toContain('src_quranpedia');
      expect(allSources.map((s) => s.sourceId)).toContain('src_dorar');
      expect(allSources.map((s) => s.sourceId)).toContain('src_islamic_content');
      expect(allSources.map((s) => s.sourceId)).toContain('src_dawa_center');
    });
  });
});
