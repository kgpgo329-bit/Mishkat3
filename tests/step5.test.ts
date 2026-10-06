import { describe, it, expect } from 'vitest';
import { BM25LexicalScorer, normalizeArabicTokens } from '../src/server/retrieval/lexicalScorer.js';
import { EmbeddingService } from '../src/server/retrieval/embeddingService.js';
import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';
import { KnowledgeChunk } from '../src/shared/types/index.js';

describe('STEP 5 Focused Validation: Minimal Hybrid Retrieval', () => {
  const repo = new LocalJsonKnowledgeRepository();

  describe('1. Lexical Retrieval (BM25 for Arabic)', () => {
    it('normalizes Arabic diacritics, alefs, and filters stopwords', () => {
      const tokens1 = normalizeArabicTokens('التَّوْحِيدُ هُوَ أَصْلُ الدِّينِ فِي الإِسْلامِ');
      expect(tokens1).toContain('توحيد');
      expect(tokens1).toContain('اصل');
      expect(tokens1).toContain('دين');
      expect(tokens1).toContain('اسلام');
      // Stop words filtered
      expect(tokens1).not.toContain('في');
      expect(tokens1).not.toContain('هو');
    });

    it('scores relevant chunks higher than irrelevant ones', () => {
      const scorer = new BM25LexicalScorer();
      const mockChunks: KnowledgeChunk[] = [
        {
          chunkId: 'c1',
          sourceId: 's1',
          documentId: 'd1',
          title: 'معنى التوحيد في الإسلام',
          text: 'التوحيد هو إفراد الله سبحانه وتعالى بالعبادة والربوبية والأسماء والصفات.',
          category: 'العقيدة',
          contentHash: 'hash1',
        },
        {
          chunkId: 'c2',
          sourceId: 's1',
          documentId: 'd2',
          title: 'أحكام التجارة والبيع',
          text: 'البيع والشراء من المعاملات المباحة في الشريعة الإسلامية بشروطها.',
          category: 'الفقه',
          contentHash: 'hash2',
        },
      ];

      const scores = scorer.scoreChunks('ما هو التوحيد وإفراد الله؟', mockChunks);
      expect(scores.get('c1')).toBeGreaterThan(scores.get('c2') || 0);
      expect(scores.get('c1')).toBe(1.0); // Highest score normalized to 1
    });
  });

  describe('2. Semantic & Embedding Service with Safe Degradation', () => {
    it('computes cosine similarity accurately', () => {
      const v1 = [1, 0, 0];
      const v2 = [1, 0, 0];
      const v3 = [0, 1, 0];

      expect(EmbeddingService.cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5);
      expect(EmbeddingService.cosineSimilarity(v1, v3)).toBeCloseTo(0.0, 5);
    });

    it('safely degrades when service is unavailable without throwing or generating fake embeddings', async () => {
      // Embedding service with no API key
      const offlineService = new EmbeddingService({ apiKey: '', model: 'disabled' });
      expect(offlineService.isAvailable()).toBe(false);

      const emb = await offlineService.embedText('اختبار');
      expect(emb).toBeNull();

      // Ensure chunks embedded returns empty or whatever is in cache without crashing
      const mockChunks: KnowledgeChunk[] = [
        {
          chunkId: 'mock_1',
          sourceId: 's1',
          documentId: 'd1',
          title: 'عنوان',
          text: 'نص غير مسجل',
          category: 'عام',
          contentHash: 'non_existent_hash_9999',
        },
      ];
      const res = await offlineService.ensureChunksEmbedded(mockChunks);
      expect(res.has('mock_1')).toBe(false);
    });
  });

  describe('3. Hybrid Retrieval & Provenance', () => {
    const retriever = new HybridRetriever(repo);

    it('retrieves candidate chunks with full provenance and combined score', async () => {
      const result = await retriever.retrieve(
        {
          question: 'ما معنى التوحيد؟',
          claims: ['التوحيد إفراد الله بالعبادة'],
        },
        { topK: 5 }
      );

      expect(result.question).toBe('ما معنى التوحيد؟');
      expect(result.allCandidates.length).toBeGreaterThan(0);
      expect(result.allCandidates.length).toBeLessThanOrEqual(10); // topK * 2 max for all

      // Verify provenance on every candidate
      for (const candidate of result.allCandidates) {
        expect(candidate.chunkId).toBeDefined();
        expect(candidate.documentId).toBeDefined();
        expect(candidate.sourceId).toBeDefined();
        expect(candidate.sourceName).toBeDefined();
        expect(candidate.contentHash).toBeDefined();
        expect(candidate.content.length).toBeGreaterThan(0);
        expect(candidate.combinedScore).toBeGreaterThanOrEqual(0);
        expect(candidate.lexicalScore).toBeGreaterThanOrEqual(0);

        // Verification labels check: Chunks must NOT have verification labels
        expect((candidate as Record<string, unknown>).verificationStatus).toBeUndefined();
        expect((candidate as Record<string, unknown>).isVerified).toBeUndefined();
      }
    });

    it('enforces Top-K limit per claim', async () => {
      const topK = 3;
      const result = await retriever.retrieve(
        {
          question: 'لماذا توجد أحكام مختلفة بين العلماء؟',
          claims: [
            'اختلاف العلماء في الفروع ناشئ عن أدلة وقواعد الاجتهاد',
            'الاختلاف رحمة وسعة',
          ],
        },
        { topK }
      );

      expect(result.claimResults).toHaveLength(2);
      for (const cr of result.claimResults) {
        expect(cr.candidates.length).toBeLessThanOrEqual(topK);
        // Scores are ordered descending
        for (let i = 1; i < cr.candidates.length; i++) {
          expect(cr.candidates[i - 1].combinedScore).toBeGreaterThanOrEqual(
            cr.candidates[i].combinedScore
          );
        }
      }
    });

    it('operates in pure lexical mode gracefully if embedding is disabled', async () => {
      const offlineEmb = new EmbeddingService({ apiKey: '', model: 'gemini-embedding-001' });
      const offlineRetriever = new HybridRetriever(repo, offlineEmb);

      const result = await offlineRetriever.retrieve({
        question: 'ما تفسير سورة الإخلاص؟',
      });

      expect(result.retrievalMode).toBe('LEXICAL_ONLY');
      expect(result.allCandidates.length).toBeGreaterThan(0);
      for (const c of result.allCandidates) {
        expect(c.semanticScore).toBeNull();
        expect(c.combinedScore).toBe(c.lexicalScore);
      }
    });

    it('wires into POST /api/ask returning candidate chunks without answering or verifying', async () => {
      const { createApp } = await import('../src/server/app.js');
      const request = (await import('supertest')).default;
      const { setAIProvider, getAIProvider } = await import('../src/server/ai/GeminiAIProvider.js');
      const originalProvider = getAIProvider();

      setAIProvider({
        understandQuestion: async () => ({
          originalQuestion: 'ما معنى التوحيد؟',
          normalizedQuestion: 'ما معنى التوحيد في الإسلام؟',
          category: 'العقيدة',
          task: 'تعريف اصطلاحي',
          topic: 'التوحيد',
          userGoal: 'فهم التوحيد',
          claims: ['التوحيد إفراد الله بالربوبية والألوهية'],
          requestedEvidence: ['القرآن والسنة'],
          needsClarification: false,
          isPersonalFatwa: false,
        }),
        verifyEvidence: async () => { throw new Error('Not implemented in Step 5'); },
        generateGroundedAnswer: async () => { throw new Error('Not implemented in Step 5'); },
        validateGrounding: async () => { throw new Error('Not implemented in Step 5'); },
        generateFollowUps: async () => { throw new Error('Not implemented in Step 5'); },
        generateAssessment: async () => { throw new Error('Not implemented in Step 5'); },
        generateReport: async () => { throw new Error('Not implemented in Step 5'); },
      });

      try {
        const app = createApp();
        const res = await request(app)
          .post('/api/ask')
          .send({
            sessionId: 'sess_test_step5',
            question: 'ما معنى التوحيد؟',
            origin: 'USER',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.candidates).toBeDefined();
        expect(res.body.data.candidates.length).toBeGreaterThan(0);
        expect(res.body.data.retrieval).toBeDefined();
        expect(res.body.data.retrieval.allCandidates.length).toBeGreaterThan(0);
        expect(res.body.data.status).toBe('INSUFFICIENT');
      } finally {
        setAIProvider(originalProvider);
      }
    });
  });
});

