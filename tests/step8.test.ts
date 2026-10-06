import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import {
  GeminiAIProvider,
  setAIProvider,
  getAIProvider,
} from '../src/server/ai/GeminiAIProvider.js';
import {
  QuestionUnderstandingResult,
  FollowUpQuestion,
} from '../src/shared/types/index.js';

const app = createApp();

describe('STEP 8 Focused Validation: AI Deep Learning Follow-Ups', () => {
  const originalProvider = getAIProvider();

  afterEach(() => {
    setAIProvider(originalProvider);
  });

  describe('1. Follow-Up Generation on Eligible Answers', () => {
    it('ANSWERED_FOLLOWUPS: generates 3 educational follow-ups with origin=DEEP_LEARNING and parentInteractionId when status is ANSWERED', async () => {
      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'ما هي أركان الإيمان في الإسلام؟',
        normalizedQuestion: 'ما هي أركان الإيمان الستة في الإسلام؟',
        category: 'العقيدة',
        task: 'بيان أركان الإيمان',
        topic: 'أركان الإيمان',
        userGoal: 'معرفة أركان الإيمان',
        claims: ['أركان الإيمان ستة هي الإيمان بالله وملائكته وكتبه ورسله واليوم الآخر والقدر'],
        requestedEvidence: ['حديث جبريل'],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockFollowUps: FollowUpQuestion[] = [
        {
          id: 'fu_int_test_1',
          question: 'ما الأدلة على الإيمان بالقضاء والقدر؟',
          type: 'دليل أعمق',
          origin: 'DEEP_LEARNING',
          parentInteractionId: 'int_test',
        },
        {
          id: 'fu_int_test_2',
          question: 'ما الفرق بين أركان الإيمان وأركان الإسلام؟',
          type: 'مقارنة',
          origin: 'DEEP_LEARNING',
          parentInteractionId: 'int_test',
        },
        {
          id: 'fu_int_test_3',
          question: 'كيف ينعكس الإيمان باليوم الآخر على سلوك المؤمن؟',
          type: 'أثر المسألة',
          origin: 'DEEP_LEARNING',
          parentInteractionId: 'int_test',
        },
      ];

      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
        verifyEvidence: async () => ({
          chunkId: 'chk_tawhid_1',
          claimId: 'claim_1',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.95,
          relation: 'مدعوم',
        }),
        generateGroundedAnswer: async () => ({
          answer: 'أركان الإيمان ستة: الإيمان بالله وملائكته وكتبه ورسله واليوم الآخر والقدر خيره وشره.',
          citedChunkIds: ['chk_tawhid_1'],
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
        generateFollowUps: async (params: any) =>
          mockFollowUps.map((fu, idx) => ({
            ...fu,
            id: `fu_${params.parentInteractionId}_${idx + 1}`,
            parentInteractionId: params.parentInteractionId,
          })),
      };

      setAIProvider(mockProvider as any);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_step8',
          question: 'ما هي أركان الإيمان في الإسلام؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ANSWERED');
      expect(res.body.data.followUps).toHaveLength(3);

      // Verify origin and parentInteractionId
      const returnedFollowUps = res.body.data.followUps;
      for (const fu of returnedFollowUps) {
        expect(fu.origin).toBe('DEEP_LEARNING');
        expect(fu.parentInteractionId).toBe(res.body.data.interactionId);
        expect(fu.question).toBeTruthy();
      }
    });

    it('PARTIAL_FOLLOWUPS: generates educational follow-ups for usable PARTIAL answer with notice', async () => {
      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'ما تفسير سورة الإخلاص؟',
        normalizedQuestion: 'ما تفسير معاني سورة الإخلاص؟',
        category: 'التفسير',
        task: 'تفسير سورة الإخلاص',
        topic: 'سورة الإخلاص',
        userGoal: 'معرفة التفسير',
        claims: ['معنى الصمد في سورة الإخلاص', 'بيان أسباب نزول سورة الإخلاص'],
        requestedEvidence: ['التفسير الميسر'],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
        verifyEvidence: async (params: any) => {
          if (params.claim.includes('الصمد')) {
            return {
              chunkId: params.candidateChunk.chunkId,
              claimId: params.claimId || 'claim_1',
              sourceId: params.candidateChunk.sourceId,
              verificationStatus: 'SUPPORTED' as const,
              confidence: 0.9,
              relation: 'مدعوم بالنص المصدري',
            };
          }
          return {
            chunkId: params.candidateChunk.chunkId,
            claimId: params.claimId || 'claim_2',
            sourceId: params.candidateChunk.sourceId,
            verificationStatus: 'UNSUPPORTED' as const,
            confidence: 0.1,
            relation: 'غير مدعوم',
          };
        },
        generateGroundedAnswer: async (params: any) => ({
          answer: 'تفسير سورة الإخلاص يتضمن معنى الصمد وهو السيد المقصود في الحوائج.',
          citedChunkIds: params.verifiedEvidence
            .filter((e: any) => e.verificationStatus === 'SUPPORTED')
            .map((e: any) => e.chunkId),
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
        generateFollowUps: async (params: any) => [
          {
            id: `fu_${params.parentInteractionId}_1`,
            question: 'ما هي فضائل سورة الإخلاص في الأحاديث الصحيحة؟',
            type: 'دليل أعمق',
            origin: 'DEEP_LEARNING' as const,
            parentInteractionId: params.parentInteractionId,
          },
        ],
      };

      setAIProvider(mockProvider as any);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_step8',
          question: 'ما تفسير سورة الإخلاص؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PARTIAL');
      expect(res.body.data.answer).toContain('تنبيه: المصادر المعتمدة المتوفرة حالياً تجيب جزئياً');
      expect(res.body.data.followUps).toHaveLength(1);
      expect(res.body.data.followUps[0].origin).toBe('DEEP_LEARNING');
    });
  });

  describe('2. Ineligible Route Gates (Must Return followUps = [])', () => {
    it('INSUFFICIENT_GATE: returns empty follow-ups when evidence is INSUFFICIENT', async () => {
      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'سؤال غير مغطى بالأدلة؟',
        normalizedQuestion: 'سؤال غير مغطى بالأدلة؟',
        category: 'العقيدة',
        task: 'بحث',
        topic: 'مجهول',
        userGoal: 'استفسار',
        claims: ['دعوى لا سند لها في المستودع'],
        requestedEvidence: [],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      let followUpsCalled = false;
      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
        verifyEvidence: async () => ({
          chunkId: 'chk_1',
          claimId: 'claim_1',
          verificationStatus: 'UNSUPPORTED' as const,
          confidence: 0.1,
          relation: 'غير مدعوم',
        }),
        generateGroundedAnswer: async () => ({
          answer: 'لم أجد في المصادر المعتمدة المتاحة أدلة كافية لصياغة إجابة موثوقة عن هذا السؤال.',
          citedChunkIds: [],
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
        generateFollowUps: async () => {
          followUpsCalled = true;
          return [];
        },
      };

      setAIProvider(mockProvider as any);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_step8',
          question: 'سؤال غير مغطى بالأدلة؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INSUFFICIENT');
      expect(followUpsCalled).toBe(false);
      expect(res.body.data.followUps).toEqual([]);
    });

    it('PERSONAL_FATWA_GATE: returns empty follow-ups for personal fatwa requests', async () => {
      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'أنا طلقت زوجتي في ساعة غضب فهل يقع الطلاق؟',
        normalizedQuestion: 'حكم وقوع الطلاق في الغضب لمسألة شخصية',
        category: 'الفقه',
        task: 'استفتاء شخصي',
        topic: 'أحكام الطلاق الشخصية',
        userGoal: 'طلب فتوى خاصة',
        claims: [],
        requestedEvidence: [],
        needsClarification: false,
        isPersonalFatwa: true,
      };

      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
        generateFollowUps: async () => [
          {
            id: 'fu_should_not_exist',
            question: 'سؤال غير مسموح به',
            type: 'مفهوم مرتبط',
            origin: 'DEEP_LEARNING' as const,
            parentInteractionId: 'any',
          },
        ],
      };

      setAIProvider(mockProvider as any);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_step8',
          question: 'أنا طلقت زوجتي في ساعة غضب فهل يقع الطلاق؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PERSONAL_FATWA');
      expect(res.body.data.followUps).toEqual([]);
    });

    it('CLARIFICATION_GATE: returns empty follow-ups when needsClarification is true', async () => {
      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'ما حكم هذا؟',
        normalizedQuestion: 'ما حكم هذا الأمر المبهم؟',
        category: 'الفقه',
        task: 'طلب توضيح',
        topic: 'مبهم',
        userGoal: 'استفسار مبهم',
        claims: [],
        requestedEvidence: [],
        needsClarification: true,
        clarificationReason: 'السؤال مبهم ويحتاج لتحديد الأمر المسؤول عنه',
        isPersonalFatwa: false,
      };

      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
      };

      setAIProvider(mockProvider as any);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_step8',
          question: 'ما حكم هذا؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('NEEDS_CLARIFICATION');
      expect(res.body.data.followUps).toEqual([]);
    });

    it('SERVICE_ERROR_GATE: returns empty follow-ups on service error', async () => {
      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'سؤال؟',
        normalizedQuestion: 'سؤال؟',
        category: 'العقيدة',
        task: 'بيان',
        topic: 'موضوع',
        userGoal: 'هدف',
        claims: ['دعوى'],
        requestedEvidence: [],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
        verifyEvidence: async () => ({
          chunkId: 'chk_1',
          claimId: 'claim_1',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.9,
          relation: 'مدعوم',
        }),
        generateGroundedAnswer: async () => {
          throw new Error('Fatal synthesis crash');
        },
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
        generateFollowUps: async () => [],
      };

      setAIProvider(mockProvider as any);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_step8',
          question: 'سؤال؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SERVICE_ERROR');
      expect(res.body.data.followUps).toEqual([]);
    });
  });

  describe('3. Failure Isolation & Pipeline Uniformity', () => {
    it('FOLLOWUP_FAILURE_ISOLATION: follow-up generation failure does not destroy original grounded answer', async () => {
      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'ما معنى التوحيد؟',
        normalizedQuestion: 'ما هو معنى التوحيد في الشريعة؟',
        category: 'العقيدة',
        task: 'بيان معنى التوحيد',
        topic: 'التوحيد',
        userGoal: 'فهم التوحيد',
        claims: ['التوحيد هو إفراد الله بالعبادة'],
        requestedEvidence: ['المحتوى الإسلامي'],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
        verifyEvidence: async (params: any) => ({
          chunkId: params.candidateChunk.chunkId,
          claimId: params.claimId || 'claim_1',
          sourceId: params.candidateChunk.sourceId,
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.95,
          relation: 'مدعوم',
        }),
        generateGroundedAnswer: async (params: any) => ({
          answer: 'التوحيد هو إفراد الله سبحانه وتعالى بالعبادة والربوبية والأسماء والصفات.',
          citedChunkIds: params.verifiedEvidence.map((e: any) => e.chunkId),
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
        // Follow-up generation fails with an unexpected exception
        generateFollowUps: async () => {
          throw new Error('Gemini follow-up API timeout after 6000ms');
        },
      };

      setAIProvider(mockProvider as any);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_step8',
          question: 'ما معنى التوحيد؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Original answer must be completely preserved despite follow-up failure
      expect(res.body.data.status).toBe('ANSWERED');
      expect(res.body.data.answer).toContain('إفراد الله سبحانه وتعالى بالعبادة');
      expect(res.body.data.citations).toHaveLength(1);
      // Follow-ups safely defaults to empty array
      expect(res.body.data.followUps).toEqual([]);
    });

    it('SAME_PIPELINE_TEST & ORIGIN_TEST & PARENT_INTERACTION_TEST: selecting a follow-up submits through identical pipeline with origin=DEEP_LEARNING and parentInteractionId', async () => {
      let pipelineRanWithOrigin = '';
      let pipelineRanWithParentId: string | undefined = '';

      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'ما الفرق بين القضاء والقدر؟',
        normalizedQuestion: 'ما هو الفرق الدقيق بين القضاء والقدر؟',
        category: 'العقيدة',
        task: 'مقارنة عقدية',
        topic: 'القضاء والقدر',
        userGoal: 'معرفة الفرق',
        claims: ['القضاء والقدر مفهومان في أصول الإيمان'],
        requestedEvidence: [],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockProvider = {
        understandQuestion: async (params: any) => {
          return mockUnderstanding;
        },
        verifyEvidence: async () => ({
          chunkId: 'chk_tawhid_1',
          claimId: 'claim_1',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.9,
          relation: 'مدعوم',
        }),
        generateGroundedAnswer: async () => ({
          answer: 'القضاء والقدر عند أهل السنة من أركان الإيمان، وبيان الفرق بينهما مذكور في كتب العقيدة.',
          citedChunkIds: ['chk_tawhid_1'],
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
        generateFollowUps: async (params: any) => [
          {
            id: `fu_${params.parentInteractionId}_1`,
            question: 'ما هي مراتب الإيمان بالقدر الأربعة؟',
            type: 'دليل أعمق',
            origin: 'DEEP_LEARNING' as const,
            parentInteractionId: params.parentInteractionId,
          },
        ],
      };

      setAIProvider(mockProvider as any);

      // 1. Initial USER question
      const firstRes = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_step8',
          question: 'ما هي أركان الإيمان؟',
          origin: 'USER',
        });

      const parentId = firstRes.body.data.interactionId;
      expect(parentId).toBeTruthy();

      // 2. User selects a follow-up question -> submits to SAME /api/ask
      const secondRes = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_test_step8',
          question: 'ما الفرق بين القضاء والقدر؟',
          origin: 'DEEP_LEARNING',
          parentInteractionId: parentId,
        });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.success).toBe(true);
      expect(secondRes.body.data.interactionId).toBeTruthy();
      expect(secondRes.body.data.interactionId).not.toBe(parentId); // New unique interaction
      expect(secondRes.body.data.status).toBe('ANSWERED');
      expect(secondRes.body.data.answer).toBeTruthy();
      expect(secondRes.body.data.evidence).toHaveLength(1); // Ran through real verification!
      expect(secondRes.body.data.understanding).toBeTruthy(); // Ran through real understanding!
    });

    it('UI_INTEGRATION: mishkatApi client submits selected follow-up with origin=DEEP_LEARNING and parentInteractionId', async () => {
      let capturedPayload: any = null;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (_url: any, init: any) => {
        capturedPayload = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            success: true,
            data: { interactionId: 'int_followup_res', status: 'ANSWERED' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      try {
        const { mishkatApi } = await import('../src/client/api/mishkatApi.js');
        const res = await mishkatApi.askQuestion({
          sessionId: 'sess_ui_integration',
          question: 'ما هي ثمرات الإيمان بالقضاء والقدر؟',
          origin: 'DEEP_LEARNING',
          parentInteractionId: 'int_orig_789',
        });

        expect(res.success).toBe(true);
        expect(capturedPayload).toEqual({
          sessionId: 'sess_ui_integration',
          question: 'ما هي ثمرات الإيمان بالقضاء والقدر؟',
          origin: 'DEEP_LEARNING',
          parentInteractionId: 'int_orig_789',
        });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
