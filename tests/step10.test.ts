import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { interactionStorage } from '../src/server/storage/InMemoryInteractionStorage.js';
import { assessmentStorage } from '../src/server/storage/InMemoryAssessmentStorage.js';
import {
  setAIProvider,
  getAIProvider,
} from '../src/server/ai/GeminiAIProvider.js';
import { AskResponse, AssessmentRecord } from '../src/shared/types/index.js';

const app = createApp();

describe('STEP 10 Focused Validation: AI Personalized Assessment', () => {
  const originalProvider = getAIProvider();

  beforeEach(() => {
    interactionStorage.clear();
    assessmentStorage.clear();
  });

  afterEach(() => {
    setAIProvider(originalProvider);
  });

  function seedEligibleInteractions(sessionId: string, count: number): AskResponse[] {
    const list: AskResponse[] = [];
    for (let i = 1; i <= count; i++) {
      const resp: AskResponse = {
        interactionId: `int_${sessionId}_${i}`,
        sessionId,
        origin: i % 2 === 0 ? 'DEEP_LEARNING' : 'USER',
        status: 'ANSWERED',
        question: `مسألة محققة رقم ${i} في العقيدة؟`,
        answer: `بيان علمي مؤصل للمسألة رقم ${i}.`,
        citations: [
          {
            sourceId: 'src_ic',
            sourceName: 'المحتوى الإسلامي',
            documentId: `doc_${i}`,
            chunkId: `chk_${i}`,
            title: `عنوان ${i}`,
          },
        ],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
        understanding: {
          originalQuestion: `مسألة محققة رقم ${i}؟`,
          normalizedQuestion: `مسألة محققة رقم ${i}؟`,
          category: 'العقيدة',
          task: 'بيان',
          topic: `مبحث ${i}`,
          userGoal: 'فهم',
          claims: [`دعوى ${i}`],
          requestedEvidence: [],
          needsClarification: false,
          isPersonalFatwa: false,
        },
      };
      interactionStorage.set(resp.interactionId, resp);
      list.push(resp);
    }
    return list;
  }

  describe('1. Assessment Gate (20-record threshold)', () => {
    it('LOCKED_AT_19: status is LOCKED with 19 eligible records and generate is rejected with 403', async () => {
      seedEligibleInteractions('sess_gate_19', 19);

      // Status check
      const statusRes = await request(app).get('/api/assessment/status?sessionId=sess_gate_19');
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('LOCKED');
      expect(statusRes.body.data.currentCount).toBe(19);
      expect(statusRes.body.data.remainingCount).toBe(1);

      // Attempt generate before reaching 20 -> MUST BE REJECTED
      const genRes = await request(app)
        .post('/api/assessment/generate')
        .send({ sessionId: 'sess_gate_19' });

      expect(genRes.status).toBe(403);
      expect(genRes.body.success).toBe(false);
      expect(genRes.body.error.code).toBe('ASSESSMENT_NOT_ELIGIBLE');
    });

    it('UNLOCKED_AT_20: status is READY at exactly 20 eligible records', async () => {
      seedEligibleInteractions('sess_gate_20', 20);

      const statusRes = await request(app).get('/api/assessment/status?sessionId=sess_gate_20');
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('READY');
      expect(statusRes.body.data.currentCount).toBe(20);
      expect(statusRes.body.data.remainingCount).toBe(0);
    });

    it('UNLOCKED_AT_GREATER_THAN_20: status remains READY with > 20 records', async () => {
      seedEligibleInteractions('sess_gate_25', 25);

      const statusRes = await request(app).get('/api/assessment/status?sessionId=sess_gate_25');
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('READY');
      expect(statusRes.body.data.currentCount).toBe(25);
      expect(statusRes.body.data.remainingCount).toBe(0);
    });
  });

  describe('2. Allowed Knowledge & Session Isolation', () => {
    it('ELIGIBLE_ONLY: ignores ineligible records (FATWA, CLARIFICATION, INSUFFICIENT, SERVICE_ERROR) in assessment count and knowledge pool', async () => {
      const sessionId = 'sess_ineligible_filter';
      // 18 eligible
      seedEligibleInteractions(sessionId, 18);

      // 4 ineligible records added to the same session
      interactionStorage.set('int_inelig_fatwa', {
        interactionId: 'int_inelig_fatwa',
        sessionId,
        origin: 'USER',
        status: 'PERSONAL_FATWA',
        question: 'استفتاء طلاق',
        citations: [],
      });
      interactionStorage.set('int_inelig_clarify', {
        interactionId: 'int_inelig_clarify',
        sessionId,
        origin: 'USER',
        status: 'NEEDS_CLARIFICATION',
        question: 'ما حكم هذا؟',
        citations: [],
      });
      interactionStorage.set('int_inelig_insuff', {
        interactionId: 'int_inelig_insuff',
        sessionId,
        origin: 'USER',
        status: 'INSUFFICIENT',
        question: 'شبهة لم توثق',
        answer: 'لم أجد في المصادر المعتمدة المتاحة أدلة كافية لصياغة إجابة موثوقة عن هذا السؤال.',
        citations: [],
      });
      interactionStorage.set('int_inelig_err', {
        interactionId: 'int_inelig_err',
        sessionId,
        origin: 'USER',
        status: 'SERVICE_ERROR',
        question: 'خطأ',
        citations: [],
      });

      // Total interactions is 22, but eligible count MUST BE 18
      const statusRes = await request(app).get(`/api/assessment/status?sessionId=${sessionId}`);
      expect(statusRes.body.data.currentCount).toBe(18);
      expect(statusRes.body.data.status).toBe('LOCKED');
    });

    it('SESSION_ISOLATION: 20 records in session A do not unlock assessment for session B', async () => {
      seedEligibleInteractions('session_A', 20);
      seedEligibleInteractions('session_B', 5);

      const resA = await request(app).get('/api/assessment/status?sessionId=session_A');
      expect(resA.body.data.status).toBe('READY');

      const resB = await request(app).get('/api/assessment/status?sessionId=session_B');
      expect(resB.body.data.status).toBe('LOCKED');
      expect(resB.body.data.currentCount).toBe(5);
    });
  });

  describe('3. Generation Structure, Traceability & Answer Security', () => {
    it('generates exactly 5 questions with 4 options each, valid sourceInteractionIds, and HIDES answer keys from client', async () => {
      const sessionId = 'sess_gen_security';
      const eligible = seedEligibleInteractions(sessionId, 20);
      const validIds = eligible.map((e) => e.interactionId);

      const mockAssessmentRecord: AssessmentRecord = {
        assessmentId: 'ass_secure_123',
        sessionId,
        basedOnRecordIds: validIds,
        status: 'READY',
        createdAt: new Date().toISOString(),
        totalQuestions: 5,
        questions: [
          {
            id: 'q1',
            questionId: 'q1',
            question: 'سؤال تقييمي 1؟',
            options: ['خيار أ', 'خيار ب', 'خيار ج', 'خيار د'],
            correctAnswer: 0,
            correctOptionId: 0,
            explanation: 'شرح أ',
            sourceRecordIds: [validIds[0]],
            sourceInteractionIds: [validIds[0]],
          },
          {
            id: 'q2',
            questionId: 'q2',
            question: 'سؤال تقييمي 2؟',
            options: ['خيار أ', 'خيار ب', 'خيار ج', 'خيار د'],
            correctAnswer: 1,
            correctOptionId: 1,
            explanation: 'شرح ب',
            sourceRecordIds: [validIds[1]],
            sourceInteractionIds: [validIds[1]],
          },
          {
            id: 'q3',
            questionId: 'q3',
            question: 'سؤال تقييمي 3؟',
            options: ['خيار أ', 'خيار ب', 'خيار ج', 'خيار د'],
            correctAnswer: 2,
            correctOptionId: 2,
            explanation: 'شرح ج',
            sourceRecordIds: [validIds[2]],
            sourceInteractionIds: [validIds[2]],
          },
          {
            id: 'q4',
            questionId: 'q4',
            question: 'سؤال تقييمي 4؟',
            options: ['خيار أ', 'خيار ب', 'خيار ج', 'خيار د'],
            correctAnswer: 3,
            correctOptionId: 3,
            explanation: 'شرح د',
            sourceRecordIds: [validIds[3]],
            sourceInteractionIds: [validIds[3]],
          },
          {
            id: 'q5',
            questionId: 'q5',
            question: 'سؤال تقييمي 5؟',
            options: ['خيار أ', 'خيار ب', 'خيار ج', 'خيار د'],
            correctAnswer: 0,
            correctOptionId: 0,
            explanation: 'شرح هـ',
            sourceRecordIds: [validIds[4]],
            sourceInteractionIds: [validIds[4]],
          },
        ],
      };

      const mockProvider = {
        generateAssessment: async () => mockAssessmentRecord,
      };
      setAIProvider(mockProvider as any);

      const genRes = await request(app)
        .post('/api/assessment/generate')
        .send({ sessionId });

      expect(genRes.status).toBe(200);
      expect(genRes.body.success).toBe(true);

      const clientView = genRes.body.data;
      expect(clientView.assessmentId).toBe('ass_secure_123');
      expect(clientView.questions).toHaveLength(5); // QUESTION_COUNT: exactly 5

      for (const q of clientView.questions) {
        // FOUR_OPTIONS: 4 options each
        expect(q.options).toHaveLength(4);
        expect(q.question).toBeTruthy();
        // ANSWER_KEY_HIDDEN: correctAnswer, correctOptionId, explanation MUST NOT be exposed in client payload!
        expect((q as any).correctAnswer).toBeUndefined();
        expect((q as any).correctOptionId).toBeUndefined();
        expect((q as any).explanation).toBeUndefined();
      }

      // TRACEABILITY: Server-side stored record preserves valid sourceInteractionIds
      const stored = assessmentStorage.get('ass_secure_123');
      expect(stored).toBeTruthy();
      expect(stored?.questions[0].sourceInteractionIds).toEqual([validIds[0]]);
    });

    it('SINGLE_CORRECT & TRACEABILITY: verifies each question has exactly one correct option in range [0..3] referencing valid sourceInteractionIds', async () => {
      const sessionId = 'sess_single_correct';
      const eligible = seedEligibleInteractions(sessionId, 20);
      const validIds = eligible.map((e) => e.interactionId);

      const mockAssessmentRecord: AssessmentRecord = {
        assessmentId: 'ass_single_correct',
        sessionId,
        basedOnRecordIds: validIds,
        status: 'READY',
        createdAt: new Date().toISOString(),
        totalQuestions: 5,
        questions: validIds.slice(0, 5).map((id, idx) => ({
          id: `q_${idx}`,
          questionId: `q_${idx}`,
          question: `سؤال ${idx}`,
          options: ['أ', 'ب', 'ج', 'د'],
          correctAnswer: idx % 4,
          correctOptionId: idx % 4,
          explanation: `شرح ${idx}`,
          sourceRecordIds: [id],
          sourceInteractionIds: [id],
        })),
      };

      setAIProvider({
        generateAssessment: async () => mockAssessmentRecord,
      } as any);

      const genRes = await request(app)
        .post('/api/assessment/generate')
        .send({ sessionId });

      expect(genRes.status).toBe(200);
      const stored = assessmentStorage.get('ass_single_correct');
      expect(stored).toBeDefined();
      for (const q of stored!.questions) {
        expect(typeof q.correctAnswer).toBe('number');
        expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(q.correctAnswer).toBeLessThanOrEqual(3);
        expect(q.sourceInteractionIds && q.sourceInteractionIds.length > 0).toBe(true);
        expect(validIds).toContain(q.sourceInteractionIds![0]);
      }
    });
  });

  describe('4. Deterministic Server-Side Scoring & Submission', () => {
    it('SERVER_SCORING: scores submitted answers deterministically without external AI call', async () => {
      const sessionId = 'sess_scoring';
      seedEligibleInteractions(sessionId, 20);

      const mockAssessmentRecord: AssessmentRecord = {
        assessmentId: 'ass_scoring_test',
        sessionId,
        basedOnRecordIds: ['int_1'],
        status: 'READY',
        createdAt: new Date().toISOString(),
        totalQuestions: 5,
        questions: [
          {
            questionId: 'q1',
            question: 'س1',
            options: ['0', '1', '2', '3'],
            correctAnswer: 0,
            explanation: 'شرح 1',
            sourceRecordIds: ['int_1'],
          },
          {
            questionId: 'q2',
            question: 'س2',
            options: ['0', '1', '2', '3'],
            correctAnswer: 1,
            explanation: 'شرح 2',
            sourceRecordIds: ['int_1'],
          },
          {
            questionId: 'q3',
            question: 'س3',
            options: ['0', '1', '2', '3'],
            correctAnswer: 2,
            explanation: 'شرح 3',
            sourceRecordIds: ['int_1'],
          },
          {
            questionId: 'q4',
            question: 'س4',
            options: ['0', '1', '2', '3'],
            correctAnswer: 3,
            explanation: 'شرح 4',
            sourceRecordIds: ['int_1'],
          },
          {
            questionId: 'q5',
            question: 'س5',
            options: ['0', '1', '2', '3'],
            correctAnswer: 0,
            explanation: 'شرح 5',
            sourceRecordIds: ['int_1'],
          },
        ],
      };

      assessmentStorage.set('ass_scoring_test', mockAssessmentRecord);

      // User submits 4 correct, 1 incorrect
      const submitRes = await request(app)
        .post('/api/assessment/ass_scoring_test/submit')
        .send({
          answers: {
            q1: 0, // correct
            q2: 1, // correct
            q3: 2, // correct
            q4: 3, // correct
            q5: 1, // INCORRECT (correct was 0)
          },
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);

      const result = submitRes.body.data;
      expect(result.score).toBe(4);
      expect(result.correctCount).toBe(4);
      expect(result.totalQuestions).toBe(5);
      expect(result.percentage).toBe(80);
      expect(result.conceptPerformance).toHaveLength(5);
      expect(result.conceptPerformance[0].isCorrect).toBe(true);
      expect(result.conceptPerformance[4].isCorrect).toBe(false);
      expect(result.conceptPerformance[4].explanation).toBe('شرح 5');
    });
  });

  describe('5. Failure Isolation & UI Client Integration', () => {
    it('FAILURE_ISOLATION: AI generation failure returns safe SERVICE_ERROR without corrupting Journey', async () => {
      const sessionId = 'sess_fail_isolation';
      seedEligibleInteractions(sessionId, 20);

      const mockProvider = {
        generateAssessment: async () => {
          throw new Error('Gemini API 503 Service Unavailable');
        },
      };
      setAIProvider(mockProvider as any);

      const res = await request(app)
        .post('/api/assessment/generate')
        .send({ sessionId });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);

      // Journey records in session must remain completely intact
      const journeyRes = await request(app).get(`/api/journey?sessionId=${sessionId}`);
      expect(journeyRes.body.data.interactions).toHaveLength(20);
      expect(journeyRes.body.data.eligibleCount).toBe(20);
    });

    it('UI_INTEGRATION: mishkatApi client can query status, generate, and submit assessment', async () => {
      const { mishkatApi } = await import('../src/client/api/mishkatApi.js');

      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async (url: any, init: any) => {
          const urlStr = String(url);
          if (urlStr.includes('/assessment/status')) {
            return new Response(
              JSON.stringify({
                success: true,
                data: { status: 'READY', requiredCount: 20, currentCount: 20, remainingCount: 0 },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          if (urlStr.includes('/assessment/generate')) {
            return new Response(
              JSON.stringify({
                success: true,
                data: {
                  assessmentId: 'ass_client_test',
                  sessionId: 'sess_1',
                  status: 'READY',
                  totalQuestions: 5,
                  questions: [],
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          if (urlStr.includes('/submit')) {
            return new Response(
              JSON.stringify({
                success: true,
                data: { assessmentId: 'ass_client_test', score: 5, totalQuestions: 5, percentage: 100 },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(JSON.stringify({}), { status: 404 });
        };

        const statusResult = await mishkatApi.getAssessmentStatus('sess_client');
        expect(statusResult.success).toBe(true);
        expect(statusResult.data?.status).toBe('READY');

        const genResult = await mishkatApi.generateAssessment('sess_client');
        expect(genResult.success).toBe(true);
        expect(genResult.data?.assessmentId).toBe('ass_client_test');

        const subResult = await mishkatApi.submitAssessment('ass_client_test', { answers: { q1: 0 } });
        expect(subResult.success).toBe(true);
        expect(subResult.data?.score).toBe(5);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
