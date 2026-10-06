import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { interactionStorage } from '../src/server/storage/InMemoryInteractionStorage.js';
import {
  isEligibleForAssessment,
  toInteractionRecord,
  KnowledgeJourneyService,
} from '../src/server/journey/knowledgeJourneyService.js';
import { AskResponse } from '../src/shared/types/index.js';

const app = createApp();

describe('STEP 9 Focused Validation: Knowledge Journey', () => {
  beforeEach(() => {
    interactionStorage.clear();
  });

  describe('1. Journey Record Creation & Origins', () => {
    it('USER_RECORD: stores and displays USER interaction with origin=USER', async () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_user_1',
        sessionId: 'sess_journey_1',
        origin: 'USER',
        status: 'ANSWERED',
        question: 'ما هي أركان الإيمان؟',
        answer: 'أركان الإيمان ستة: الإيمان بالله وملائكته...',
        citations: [{ sourceId: 'src_ic', sourceName: 'المحتوى', documentId: 'd1', chunkId: 'c1', title: 't1' }],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
        understanding: {
          originalQuestion: 'ما هي أركان الإيمان؟',
          normalizedQuestion: 'ما هي أركان الإيمان؟',
          category: 'العقيدة',
          task: 'بيان',
          topic: 'أركان الإيمان',
          userGoal: 'تعلم',
          claims: ['أركان الإيمان ستة'],
          requestedEvidence: [],
          needsClarification: false,
          isPersonalFatwa: false,
        },
      };

      interactionStorage.set(mockResponse.interactionId, mockResponse);

      const res = await request(app).get('/api/journey?sessionId=sess_journey_1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.interactions).toHaveLength(1);
      expect(res.body.data.interactions[0].origin).toBe('USER');
      expect(res.body.data.interactions[0].question).toBe('ما هي أركان الإيمان؟');
      expect(res.body.data.interactions[0].topic).toBe('أركان الإيمان');
      expect(res.body.data.interactions[0].eligibleForAssessment).toBe(true);
    });

    it('DEEP_LEARNING_RECORD & PARENT_LINK: stores DEEP_LEARNING interaction and preserves parentInteractionId', async () => {
      const parentResponse: AskResponse = {
        interactionId: 'int_parent_100',
        sessionId: 'sess_journey_dl',
        origin: 'USER',
        status: 'ANSWERED',
        question: 'ما معنى التوحيد؟',
        answer: 'التوحيد هو إفراد الله بالعبادة.',
        citations: [{ sourceId: 'src_ic', sourceName: 'المحتوى', documentId: 'd1', chunkId: 'c1', title: 't1' }],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
        understanding: {
          originalQuestion: 'ما معنى التوحيد؟',
          normalizedQuestion: 'ما معنى التوحيد؟',
          category: 'العقيدة',
          task: 'بيان',
          topic: 'التوحيد',
          userGoal: 'تعلم',
          claims: [],
          requestedEvidence: [],
          needsClarification: false,
          isPersonalFatwa: false,
        },
      };

      const dlResponse: AskResponse = {
        interactionId: 'int_child_200',
        sessionId: 'sess_journey_dl',
        origin: 'DEEP_LEARNING',
        parentInteractionId: 'int_parent_100',
        status: 'ANSWERED',
        question: 'ما هي أقسام التوحيد الثلاثة؟',
        answer: 'أقسام التوحيد هي: توحيد الربوبية، وتوحيد الألوهية، وتوحيد الأسماء والصفات.',
        citations: [{ sourceId: 'src_ic', sourceName: 'المحتوى', documentId: 'd2', chunkId: 'c2', title: 't2' }],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
        understanding: {
          originalQuestion: 'ما هي أقسام التوحيد الثلاثة؟',
          normalizedQuestion: 'ما هي أقسام التوحيد الثلاثة؟',
          category: 'العقيدة',
          task: 'بيان',
          topic: 'أقسام التوحيد',
          userGoal: 'تعلم',
          claims: [],
          requestedEvidence: [],
          needsClarification: false,
          isPersonalFatwa: false,
        },
      };

      interactionStorage.set(parentResponse.interactionId, parentResponse);
      interactionStorage.set(dlResponse.interactionId, dlResponse);

      const res = await request(app).get('/api/journey?sessionId=sess_journey_dl');
      expect(res.status).toBe(200);
      expect(res.body.data.interactions).toHaveLength(2);

      const dlRecord = res.body.data.interactions.find((i: any) => i.interactionId === 'int_child_200');
      expect(dlRecord).toBeTruthy();
      expect(dlRecord.origin).toBe('DEEP_LEARNING');
      expect(dlRecord.parentInteractionId).toBe('int_parent_100');
    });

    it('ORIGIN_BADGES: computes correct distribution of USER and DEEP_LEARNING interactions', async () => {
      const resp1: AskResponse = {
        interactionId: 'int_1',
        sessionId: 'sess_badges',
        origin: 'USER',
        status: 'ANSWERED',
        question: 'سؤال 1',
        answer: 'إجابة 1',
        citations: [{ sourceId: 's', sourceName: 'n', documentId: 'd', chunkId: 'c', title: 't' }],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
      };

      const resp2: AskResponse = {
        interactionId: 'int_2',
        sessionId: 'sess_badges',
        origin: 'DEEP_LEARNING',
        parentInteractionId: 'int_1',
        status: 'ANSWERED',
        question: 'سؤال 2',
        answer: 'إجابة 2',
        citations: [{ sourceId: 's', sourceName: 'n', documentId: 'd', chunkId: 'c', title: 't' }],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
      };

      interactionStorage.set(resp1.interactionId, resp1);
      interactionStorage.set(resp2.interactionId, resp2);

      const res = await request(app).get('/api/journey?sessionId=sess_badges');
      expect(res.body.data.directQuestionCount).toBe(1);
      expect(res.body.data.deepLearningQuestionCount).toBe(1);
      expect(res.body.data.originDistribution.USER).toBe(1);
      expect(res.body.data.originDistribution.DEEP_LEARNING).toBe(1);
    });
  });

  describe('2. Assessment Eligibility Rules', () => {
    it('ELIGIBILITY_RULES: grounded ANSWERED and grounded PARTIAL answers are eligible', () => {
      const answeredResp: AskResponse = {
        interactionId: 'int_ok',
        status: 'ANSWERED',
        question: 'سؤال',
        answer: 'إجابة مؤصلة',
        citations: [{ sourceId: 's', sourceName: 'n', documentId: 'd', chunkId: 'c', title: 't' }],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
      };
      expect(isEligibleForAssessment(answeredResp)).toBe(true);

      const partialResp: AskResponse = {
        interactionId: 'int_partial_ok',
        status: 'PARTIAL',
        question: 'سؤال جزئي',
        answer: 'تنبيه: المصادر المعتمدة المتوفرة حالياً تجيب جزئياً عن السؤال... النص المؤصل',
        citations: [{ sourceId: 's', sourceName: 'n', documentId: 'd', chunkId: 'c', title: 't' }],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
      };
      expect(isEligibleForAssessment(partialResp)).toBe(true);
    });

    it('INSUFFICIENT_EXCLUDED: INSUFFICIENT answers appear in journey but are NOT eligible for assessment', async () => {
      const insufficientResp: AskResponse = {
        interactionId: 'int_insuff',
        sessionId: 'sess_insuff',
        origin: 'USER',
        status: 'INSUFFICIENT',
        question: 'سؤال غير موثق؟',
        answer: 'لم أجد في المصادر المعتمدة المتاحة أدلة كافية لصياغة إجابة موثوقة عن هذا السؤال.',
        citations: [],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
      };

      interactionStorage.set(insufficientResp.interactionId, insufficientResp);

      const res = await request(app).get('/api/journey?sessionId=sess_insuff');
      expect(res.body.data.interactions).toHaveLength(1);
      expect(res.body.data.interactions[0].question).toBe('سؤال غير موثق؟');
      expect(res.body.data.interactions[0].eligibleForAssessment).toBe(false);
      expect(res.body.data.eligibleCount).toBe(0);
    });

    it('PERSONAL_FATWA_EXCLUDED: PERSONAL_FATWA interactions are NOT eligible for assessment', () => {
      const fatwaResp: AskResponse = {
        interactionId: 'int_fatwa',
        status: 'PERSONAL_FATWA',
        question: 'هل طلقت زوجتي؟',
        answer: undefined,
        citations: [],
      };
      expect(isEligibleForAssessment(fatwaResp)).toBe(false);
    });

    it('CLARIFICATION_EXCLUDED: NEEDS_CLARIFICATION interactions are NOT eligible for assessment', () => {
      const clarifyResp: AskResponse = {
        interactionId: 'int_clarify',
        status: 'NEEDS_CLARIFICATION',
        question: 'ما حكم هذا؟',
        answer: undefined,
        citations: [],
      };
      expect(isEligibleForAssessment(clarifyResp)).toBe(false);
    });

    it('SERVICE_ERROR_EXCLUDED: SERVICE_ERROR interactions are NOT eligible for assessment', () => {
      const errorResp: AskResponse = {
        interactionId: 'int_error',
        status: 'SERVICE_ERROR',
        question: 'سؤال عطل',
        answer: 'تعذر توليد الإجابة المؤصلة حالياً',
        citations: [],
      };
      expect(isEligibleForAssessment(errorResp)).toBe(false);
    });

    it('ungrounded rejected answers (remedyAction=DOWNGRADE or ungrounded) are NOT eligible', () => {
      const ungroundedResp: AskResponse = {
        interactionId: 'int_ungrounded',
        status: 'PARTIAL',
        question: 'سؤال',
        answer: 'إجابة تضمنت معلومات غير مؤصلة',
        citations: [{ sourceId: 's', sourceName: 'n', documentId: 'd', chunkId: 'c', title: 't' }],
        grounding: { isGrounded: false, unsupportedClaims: ['شبهة'], remedyAction: 'DOWNGRADE' },
      };
      expect(isEligibleForAssessment(ungroundedResp)).toBe(false);
    });
  });

  describe('3. Progress Math & Assessment Unlock (Target: 20)', () => {
    it('PROGRESS_20: accurately calculates eligibleCount, target, remaining, and unlocks assessment at 20', async () => {
      const sessionId = 'sess_progress_test';

      // Insert 19 eligible records
      for (let i = 1; i <= 19; i++) {
        const resp: AskResponse = {
          interactionId: `int_prog_${i}`,
          sessionId,
          origin: 'USER',
          status: 'ANSWERED',
          question: `سؤال ${i}`,
          answer: `إجابة ${i}`,
          citations: [{ sourceId: 's', sourceName: 'n', documentId: 'd', chunkId: `c_${i}`, title: 't' }],
          grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
        };
        interactionStorage.set(resp.interactionId, resp);
      }

      // Also insert 2 ineligible records (INSUFFICIENT and FATWA)
      interactionStorage.set('int_ineligible_1', {
        interactionId: 'int_ineligible_1',
        sessionId,
        origin: 'USER',
        status: 'INSUFFICIENT',
        question: 'سؤال غير كاف',
        answer: 'لم أجد في المصادر المعتمدة المتاحة أدلة كافية لصياغة إجابة موثوقة عن هذا السؤال.',
        citations: [],
      });
      interactionStorage.set('int_ineligible_2', {
        interactionId: 'int_ineligible_2',
        sessionId,
        origin: 'USER',
        status: 'PERSONAL_FATWA',
        question: 'فتوى خاصة',
        citations: [],
      });

      // Check state at 19 eligible
      let res = await request(app).get(`/api/journey?sessionId=${sessionId}`);
      expect(res.body.data.interactions).toHaveLength(21);
      expect(res.body.data.eligibleCount).toBe(19);
      expect(res.body.data.target).toBe(20);
      expect(res.body.data.remaining).toBe(1);
      expect(res.body.data.assessmentUnlocked).toBe(false);

      // Add the 20th eligible record
      const resp20: AskResponse = {
        interactionId: 'int_prog_20',
        sessionId,
        origin: 'DEEP_LEARNING',
        status: 'ANSWERED',
        question: 'سؤال 20',
        answer: 'إجابة 20',
        citations: [{ sourceId: 's', sourceName: 'n', documentId: 'd', chunkId: 'c_20', title: 't' }],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
      };
      interactionStorage.set(resp20.interactionId, resp20);

      // Check state at 20 eligible
      res = await request(app).get(`/api/journey?sessionId=${sessionId}`);
      expect(res.body.data.eligibleCount).toBe(20);
      expect(res.body.data.remaining).toBe(0);
      expect(res.body.data.assessmentUnlocked).toBe(true);
      expect(res.body.data.assessmentEligibility.status).toBe('READY');
    });
  });

  describe('4. Session Isolation & Client API Integration', () => {
    it('SESSION_ISOLATION: isolates journeys between different session IDs', async () => {
      const respA: AskResponse = {
        interactionId: 'int_session_A',
        sessionId: 'session_A',
        origin: 'USER',
        status: 'ANSWERED',
        question: 'سؤال لجلسة A',
        answer: 'إجابة A',
        citations: [{ sourceId: 's', sourceName: 'n', documentId: 'd', chunkId: 'c', title: 't' }],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
      };

      const respB: AskResponse = {
        interactionId: 'int_session_B',
        sessionId: 'session_B',
        origin: 'USER',
        status: 'ANSWERED',
        question: 'سؤال لجلسة B',
        answer: 'إجابة B',
        citations: [{ sourceId: 's', sourceName: 'n', documentId: 'd', chunkId: 'c', title: 't' }],
        grounding: { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' },
      };

      interactionStorage.set(respA.interactionId, respA);
      interactionStorage.set(respB.interactionId, respB);

      // Query session_A
      const resA = await request(app).get('/api/journey?sessionId=session_A');
      expect(resA.body.data.interactions).toHaveLength(1);
      expect(resA.body.data.interactions[0].question).toBe('سؤال لجلسة A');

      // Query session_B
      const resB = await request(app).get('/api/journey?sessionId=session_B');
      expect(resB.body.data.interactions).toHaveLength(1);
      expect(resB.body.data.interactions[0].question).toBe('سؤال لجلسة B');
    });

    it('UI_INTEGRATION: mishkatApi.getJourney client method successfully queries journey by sessionId', async () => {
      const { mishkatApi } = await import('../src/client/api/mishkatApi.js');

      const originalFetch = globalThis.fetch;
      let queriedUrl = '';

      globalThis.fetch = async (url: any) => {
        queriedUrl = String(url);
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              sessionId: 'sess_client_test',
              interactions: [],
              eligibleCount: 0,
              target: 20,
              remaining: 20,
              assessmentUnlocked: false,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      try {
        const result = await mishkatApi.getJourney('sess_client_test');
        expect(result.success).toBe(true);
        expect(queriedUrl).toContain('/journey?sessionId=sess_client_test');
        expect(result.data?.target).toBe(20);
        expect(result.data?.remaining).toBe(20);
        expect(result.data?.assessmentUnlocked).toBe(false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
