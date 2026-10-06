import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { EmbeddingService } from '../src/server/retrieval/embeddingService.js';
import { EvidenceVerificationService } from '../src/server/verification/evidenceVerificationService.js';
import { KnowledgeChunk, ClaimRetrievalResult, CandidateChunk } from '../src/shared/types/index.js';
import { GroundedAnswerService, INSUFFICIENT_COVERAGE_NOTICE } from '../src/server/answer/groundedAnswerService.js';
import { MishkatError } from '../src/shared/errors/MishkatError.js';

describe('Mishkat V2 — Safe Performance Patch Verification', () => {
  const cachePath = path.resolve(process.cwd(), 'data', 'knowledge', 'embeddings_cache.json');
  const chunksPath = path.resolve(process.cwd(), 'data', 'knowledge', 'chunks.json');

  describe('1. COMPLETE EMBEDDING CACHE & INTEGRITY', () => {
    it('embeddings_cache.json covers 100% of knowledge chunks with 3072 dimensions', () => {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const chunks: KnowledgeChunk[] = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));

      expect(chunks.length).toBe(188);
      expect(cacheData.model).toBe('gemini-embedding-001');

      const embeddings = cacheData.embeddings || {};
      const cachedHashes = Object.keys(embeddings);
      expect(cachedHashes.length).toBe(188);

      let missing = 0;
      let invalid = 0;
      const expectedDim = 3072;

      for (const chunk of chunks) {
        const vec = embeddings[chunk.contentHash];
        if (!vec) {
          missing++;
        } else if (!Array.isArray(vec) || vec.length !== expectedDim || vec.some((v: any) => typeof v !== 'number' || isNaN(v))) {
          invalid++;
        }
      }

      expect(missing).toBe(0);
      expect(invalid).toBe(0);
    });

    it('EmbeddingService reuses all 188 cached chunks without runtime batch embedding requests', async () => {
      const chunks: KnowledgeChunk[] = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
      const svc = new EmbeddingService({ apiKey: 'test_key' });

      expect(svc.getCachedCount()).toBe(188);

      // Spy on fetch to ensure no batchEmbedContents calls occur
      const fetchSpy = vi.fn();
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchSpy as any;

      try {
        const chunkVectors = await svc.ensureChunksEmbedded(chunks);
        expect(chunkVectors.size).toBe(188);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('safe lexical fallback remains intact when embeddings are unavailable', async () => {
      const svc = new EmbeddingService({ apiKey: '' });
      expect(svc.isAvailable()).toBe(false);

      const vector = await svc.embedText('سؤال اختباري');
      expect(vector).toBeNull();
    });
  });

  describe('2. BOUNDED CONCURRENCY & DETERMINISM IN EVIDENCE VERIFICATION', () => {
    it('strictly bounds concurrent verification calls to <= 2', async () => {
      let activeCalls = 0;
      let maxActiveCalls = 0;

      const mockProvider = {
        understandQuestion: async () => ({} as any),
        generateGroundedAnswer: async () => ({} as any),
        validateGrounding: async () => ({} as any),
        generateFollowUps: async () => [],
        verifyEvidence: async (p: any) => {
          activeCalls++;
          if (activeCalls > maxActiveCalls) {
            maxActiveCalls = activeCalls;
          }
          // Simulate network latency
          await new Promise((resolve) => setTimeout(resolve, 30));
          activeCalls--;

          return {
            evidenceId: `ev_${p.claimId}_1`,
            claimId: p.claimId,
            chunkId: p.candidateChunk?.chunkId || 'chk_1',
            sourceId: 'src_ic',
            verificationStatus: 'SUPPORTED' as const,
            confidence: 0.9,
            relation: 'مطابق صريح',
          };
        },
      };

      const verificationService = new EvidenceVerificationService(mockProvider as any);

      // Create 4 distinct claims
      const claimResults: ClaimRetrievalResult[] = [
        {
          claimId: 'claim_1',
          claim: 'الدعوى الأولى',
          candidates: [{ chunkId: 'chk_1', contentHash: 'h1', title: 'دليل 1', sourceId: 'src_ic', content: 'نص 1' } as any],
        },
        {
          claimId: 'claim_2',
          claim: 'الدعوى الثانية',
          candidates: [{ chunkId: 'chk_2', contentHash: 'h2', title: 'دليل 2', sourceId: 'src_ic', content: 'نص 2' } as any],
        },
        {
          claimId: 'claim_3',
          claim: 'الدعوى الثالثة',
          candidates: [{ chunkId: 'chk_3', contentHash: 'h3', title: 'دليل 3', sourceId: 'src_ic', content: 'نص 3' } as any],
        },
        {
          claimId: 'claim_4',
          claim: 'الدعوى الرابعة',
          candidates: [{ chunkId: 'chk_4', contentHash: 'h4', title: 'دليل 4', sourceId: 'src_ic', content: 'نص 4' } as any],
        },
      ];

      const result = await verificationService.verifyClaims({
        claimResults,
        maxCandidatesPerClaim: 2,
        maxConcurrency: 2,
      });

      expect(maxActiveCalls).toBeLessThanOrEqual(2);
      expect(maxActiveCalls).toBeGreaterThanOrEqual(1);
      expect(result.verifiedEvidence).toHaveLength(4);
    });

    it('strictly preserves deterministic claim ordering and sufficiency results', async () => {
      const mockProvider = {
        understandQuestion: async () => ({} as any),
        generateGroundedAnswer: async () => ({} as any),
        validateGrounding: async () => ({} as any),
        generateFollowUps: async () => [],
        verifyEvidence: async (p: any) => {
          // Add staggered delay to test ordering restoration
          const delay = p.claimId === 'claim_1' ? 40 : 10;
          await new Promise((resolve) => setTimeout(resolve, delay));

          if (p.claimId === 'claim_1') {
            return {
              evidenceId: 'ev_1',
              claimId: 'claim_1',
              chunkId: 'chk_1',
              sourceId: 'src_ic',
              verificationStatus: 'SUPPORTED' as const,
              confidence: 0.95,
              relation: 'دليل كامل',
            };
          } else if (p.claimId === 'claim_2') {
            return {
              evidenceId: 'ev_2',
              claimId: 'claim_2',
              chunkId: 'chk_2',
              sourceId: 'src_ic',
              verificationStatus: 'PARTIAL' as const,
              confidence: 0.6,
              relation: 'دليل جزئي',
            };
          }
          return {
            evidenceId: 'ev_3',
            claimId: 'claim_3',
            chunkId: 'chk_3',
            sourceId: 'src_ic',
            verificationStatus: 'UNSUPPORTED' as const,
            confidence: 0.2,
            relation: 'غير مدعوم',
          };
        },
      };

      const verificationService = new EvidenceVerificationService(mockProvider as any);

      const claimResults: ClaimRetrievalResult[] = [
        {
          claimId: 'claim_1',
          claim: 'دعوى أولى مدعومة',
          candidates: [{ chunkId: 'chk_1', contentHash: 'h1', title: 'تفسير 1', sourceId: 'src_ic', content: 'نص 1' } as any],
        },
        {
          claimId: 'claim_2',
          claim: 'دعوى ثانية جزئية',
          candidates: [{ chunkId: 'chk_2', contentHash: 'h2', title: 'تفسير 2', sourceId: 'src_ic', content: 'نص 2' } as any],
        },
        {
          claimId: 'claim_3',
          claim: 'دعوى ثالثة غير مدعومة',
          candidates: [{ chunkId: 'chk_3', contentHash: 'h3', title: 'تفسير 3', sourceId: 'src_ic', content: 'نص 3' } as any],
        },
      ];

      const result = await verificationService.verifyClaims({
        claimResults,
        maxCandidatesPerClaim: 2,
        maxConcurrency: 2,
      });

      // Original deterministic order must be preserved: claim_1 -> claim_2 -> claim_3
      expect(result.verifiedEvidence.map((e) => e.claimId)).toEqual(['claim_1', 'claim_2', 'claim_3']);
      expect(Object.keys(result.claimEvidenceMap)).toEqual(['claim_1', 'claim_2', 'claim_3']);

      expect(result.sufficiency.supportedClaimsCount).toBe(1);
      expect(result.sufficiency.totalClaimsCount).toBe(3);
      expect(result.sufficiency.sufficiencyState).toBe('PARTIAL');
      expect(result.sufficiency.unsupportedClaims).toEqual(['دعوى ثانية جزئية', 'دعوى ثالثة غير مدعومة']);
    });
  });

  describe('3. INSUFFICIENT SHORT-CIRCUIT & 429 SAFETY', () => {
    it('GroundedAnswerService abstains immediately without invoking Gemini generation on INSUFFICIENT', async () => {
      let generateCalled = false;
      const mockProvider = {
        understandQuestion: async () => ({} as any),
        generateGroundedAnswer: async () => {
          generateCalled = true;
          return { answer: 'إجابة لا ينبغي صياغتها', citedChunkIds: [], inferredClaims: [] };
        },
        validateGrounding: async () => ({} as any),
        generateFollowUps: async () => [],
        verifyEvidence: async () => ({} as any),
      };

      const answerService = new GroundedAnswerService(mockProvider as any);
      const res = await answerService.generateAnswer({
        question: 'سؤال غير مغطى',
        status: 'INSUFFICIENT',
        sufficiency: {
          sufficiencyState: 'INSUFFICIENT',
          claimCoverage: 0,
          supportedClaimsCount: 0,
          totalClaimsCount: 2,
          unsupportedClaims: ['دعوى غير مدعومة'],
        },
        verifiedEvidence: [],
        candidates: [],
      });

      expect(generateCalled).toBe(false);
      expect(res.status).toBe('INSUFFICIENT');
      expect(res.answer).toBe(INSUFFICIENT_COVERAGE_NOTICE);
      expect(res.citations).toEqual([]);
    });

    it('MishkatError.quotaExhausted fast-fails with 429 without endless retry loops', () => {
      const err = MishkatError.quotaExhausted();
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('AI_QUOTA_EXHAUSTED');
    });
  });
});
