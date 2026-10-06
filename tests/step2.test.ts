import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { getOrCreateClientSessionId, mishkatApi } from '../src/client/api/mishkatApi.js';
import { setAIProvider, getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

const app = createApp();

describe('STEP 2 Focused Verification', () => {
  describe('1. Client Persistent Session ID', () => {
    beforeEach(() => {
      // Mock window and localStorage
      const storage: Record<string, string> = {};
      (global as unknown as { window: unknown }).window = {
        localStorage: {
          getItem: (key: string) => storage[key] || null,
          setItem: (key: string, val: string) => {
            storage[key] = val;
          },
        },
      };
    });

    it('should create and consistently reuse the same persistent client sessionId', () => {
      const sessionId1 = getOrCreateClientSessionId();
      expect(sessionId1).toBeDefined();
      expect(sessionId1.startsWith('sess_')).toBe(true);

      const sessionId2 = getOrCreateClientSessionId();
      expect(sessionId2).toBe(sessionId1);

      const apiSessionId = mishkatApi.getSessionId();
      expect(apiSessionId).toBe(sessionId1);
    });
  });

  describe('2. POST /api/ask Validation & Request Contract', () => {
    const originalProvider = getAIProvider();

    beforeEach(() => {
      const mockProvider = {
        understandQuestion: async (p: any) => ({
          originalQuestion: p.question,
          normalizedQuestion: p.question,
          category: 'العقيدة',
          task: 'تعريف أركان',
          topic: 'أركان الإسلام',
          userGoal: 'معرفة الأركان',
          claims: ['أركان الإسلام خمسة'],
          requestedEvidence: ['حديث جبريل'],
          needsClarification: false,
          isPersonalFatwa: false,
        }),
        verifyEvidence: async (p: any) => ({
          chunkId: p.candidateChunk?.chunkId || 'chk_1',
          claimId: p.claimId || 'claim_1',
          sourceId: 'src_ic',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.95,
          relation: 'مدعوم بالنص',
        }),
        generateGroundedAnswer: async () => ({
          answer: 'أركان الإسلام خمسة: شهادة أن لا إله إلا الله، وإقام الصلاة، وإيتاء الزكاة، وصوم رمضان، وحج البيت.',
          citedChunkIds: ['chk_1'],
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
        generateFollowUps: async () => [],
      };
      setAIProvider(mockProvider as any);
    });

    afterEach(() => {
      setAIProvider(originalProvider);
    });

    it('accepts and validates direct USER question and returns structured response preserving schema', async () => {
      const payload = {
        sessionId: 'sess_user_test_1',
        question: 'ما هي أركان الإسلام الخمسة؟',
        origin: 'USER',
      };

      const res = await request(app).post('/api/ask').send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.interactionId).toBeDefined();
      expect(res.body.data.question).toBe('ما هي أركان الإسلام الخمسة؟');
      expect(res.body.data.sessionId).toBe('sess_user_test_1');
      expect(res.body.data.origin).toBe('USER');
      expect(res.body.data.status).toBeDefined();
      expect(typeof res.body.data.answer).toBe('string');
    });

    it('accepts and validates DEEP_LEARNING question preserving origin and parentInteractionId', async () => {
      const payload = {
        sessionId: 'sess_user_test_1',
        question: 'ما هو الدليل على الركن الأول؟',
        origin: 'DEEP_LEARNING',
        parentInteractionId: 'int_prior_999',
      };

      const res = await request(app).post('/api/ask').send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.origin).toBe('DEEP_LEARNING');
      expect(res.body.data.parentInteractionId).toBe('int_prior_999');
      expect(res.body.data.sessionId).toBe('sess_user_test_1');
      expect(res.body.data.status).toBeDefined();
    });

    it('rejects missing or empty question', async () => {
      const res = await request(app).post('/api/ask').send({
        sessionId: 'sess_user_test_1',
        question: ' ',
        origin: 'USER',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid question origin', async () => {
      const res = await request(app).post('/api/ask').send({
        sessionId: 'sess_user_test_1',
        question: 'سؤال تجريبي',
        origin: 'EXTERNAL_SEARCH',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects missing sessionId', async () => {
      const res = await request(app).post('/api/ask').send({
        question: 'سؤال بدون جلسة',
        origin: 'USER',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Canonical Unified askQuestion Pipeline', () => {
    it('mishkatApi exposes single askQuestion method accepting both USER and DEEP_LEARNING payloads', () => {
      expect(typeof mishkatApi.askQuestion).toBe('function');
    });
  });
});
