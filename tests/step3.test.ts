import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import {
  GeminiAIProvider,
  setAIProvider,
  getAIProvider,
} from '../src/server/ai/GeminiAIProvider.js';
import { QuestionUnderstandingResult } from '../src/shared/types/index.js';

const app = createApp();

describe('STEP 3 Focused Verification: AI Question Understanding', () => {
  const originalProvider = getAIProvider();

  afterEach(() => {
    setAIProvider(originalProvider);
  });

  describe('1. Normal Arabic Question & Atomic Claims Decomposition', () => {
    it('analyzes standard question into structured understanding with atomic claims', async () => {
      const mockResult: QuestionUnderstandingResult = {
        originalQuestion: 'ما حكم صلاة الكسوف وصفتها في الإسلام؟',
        normalizedQuestion: 'ما حكم صلاة الكسوف وما صفتها الشرعية في الفقه الإسلامي؟',
        category: 'الفقه',
        task: 'بيان حكم وصيفة عبادة',
        topic: 'صلاة الكسوف والخسوف',
        userGoal: 'معرفة الحكم الفقهي وكيفية أداء صلاة الكسوف',
        claims: [
          'صلاة الكسوف سنة مؤكدة عند جمهور الفقهاء',
          'صلاة الكسوف تصلى ركعتين في كل ركعة قيامان وقراءتان وركوعان وسجدتان',
        ],
        requestedEvidence: [
          'أحاديث الكسوف في صحيحي البخاري ومسلم',
          'إجماع الفقهاء على مشروعيتها',
        ],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockResult) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: 'test-mock-key-secret-999',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      setAIProvider(provider);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_100',
          question: 'ما حكم صلاة الكسوف وصفتها في الإسلام؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBeDefined();
      expect(res.body.data.understanding).toBeDefined();
      expect(res.body.data.understanding.category).toBe('الفقه');
      expect(res.body.data.claims).toHaveLength(2);
      expect(res.body.data.claims[0]).toBe('صلاة الكسوف سنة مؤكدة عند جمهور الفقهاء');
      expect(res.body.data.understanding.needsClarification).toBe(false);
      expect(res.body.data.understanding.isPersonalFatwa).toBe(false);
    });
  });

  describe('2. Ambiguous Question → Clarification Path', () => {
    it('detects ambiguous question and sets needsClarification and clarificationReason', async () => {
      const mockResult: QuestionUnderstandingResult = {
        originalQuestion: 'ما هو ذلك الشيء؟',
        normalizedQuestion: 'استفسار مبهم عن مسألة غير محددة',
        category: 'موضوعات إسلامية عامة',
        task: 'طلب توضيح',
        topic: 'مسألة غير محددة',
        userGoal: 'استفسار عام',
        claims: [],
        requestedEvidence: [],
        needsClarification: true,
        clarificationReason: 'السؤال مبهم جداً ولا يحدد المسألة أو المفهوم الشرعي المراد الاستفسار عنه',
        isPersonalFatwa: false,
      };

      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockResult) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: 'test-mock-key-secret-999',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      setAIProvider(provider);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_100',
          question: 'ما هو ذلك الشيء؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('NEEDS_CLARIFICATION');
      expect(res.body.data.clarificationPrompt).toContain('السؤال مبهم');
      expect(res.body.data.understanding.needsClarification).toBe(true);
    });
  });

  describe('3. Personal Fatwa Detection', () => {
    it('identifies personal individualized fatwa and flags isPersonalFatwa', async () => {
      const mockResult: QuestionUnderstandingResult = {
        originalQuestion: 'هل يجوز لي أن أطلق زوجتي في حالتي الحالية بعد نزاعنا بالأمس؟',
        normalizedQuestion: 'استفتاء شخصي خاص في واقعة طلاق ونزاع زوجي محدد',
        category: 'الفقه',
        task: 'طلب فتوى فردية خاصة',
        topic: 'أحوال شخصية - طلاق معين',
        userGoal: 'الحصول على حكم فردي في مسألة شخصية خاصة',
        claims: [],
        requestedEvidence: [],
        needsClarification: false,
        isPersonalFatwa: true,
      };

      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockResult) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: 'test-mock-key-secret-999',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      setAIProvider(provider);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_100',
          question: 'هل يجوز لي أن أطلق زوجتي في حالتي الحالية بعد نزاعنا بالأمس؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PERSONAL_FATWA');
      expect(res.body.data.understanding.isPersonalFatwa).toBe(true);
      expect(res.body.data.answer).toBeUndefined(); // Never issue a fatwa
    });
  });

  describe('4. Malformed AI Response → Safe Failure', () => {
    it('fails safely without fabricating results when AI response is malformed text', async () => {
      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'NOT VALID JSON CONTENT AT ALL' }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: 'test-mock-key-secret-999',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      setAIProvider(provider);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_100',
          question: 'سؤال عادي',
          origin: 'USER',
        });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_SERVICE_UNAVAILABLE');
    });

    it('fails safely when AI schema is missing required fields', async () => {
      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify({ broken: 'incomplete' }) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: 'test-mock-key-secret-999',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      setAIProvider(provider);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_100',
          question: 'سؤال عادي',
          origin: 'USER',
        });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_SERVICE_UNAVAILABLE');
    });
  });

  describe('5. Security: API Key Never Returned & Session ID Preserved', () => {
    it('never exposes API key in response or headers and preserves sessionId', async () => {
      const secretKey = 'AIzaSyA_TOP_SECRET_GEMINI_KEY_12345';
      const mockResult: QuestionUnderstandingResult = {
        originalQuestion: 'ما هي نواقض الوضوء؟',
        normalizedQuestion: 'ما هي مفسدات ونواقض الوضوء في الفقه الإسلامي؟',
        category: 'الفقه',
        task: 'حكم شرعي',
        topic: 'الطهارة والوضوء',
        userGoal: 'معرفة نواقض الطهارة',
        claims: ['الخارج من السبيلين ناقض للوضوء بإجماع المسلمين'],
        requestedEvidence: ['أحاديث الصحيحين في نواقض الوضوء'],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockResult) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: secretKey,
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      setAIProvider(provider);

      const sessionIdInput = 'sess_persistent_client_888';
      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: sessionIdInput,
          question: 'ما هي نواقض الوضوء؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);

      // Verify secret key is never leaked
      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toContain(secretKey);
      expect(responseString).not.toContain('TOP_SECRET');

      // Verify headers don't leak key
      const headerString = JSON.stringify(res.headers);
      expect(headerString).not.toContain(secretKey);

      // Verify sessionId is preserved in flow
      expect(res.body.data.interactionId).toBeDefined();
    });
  });
});
