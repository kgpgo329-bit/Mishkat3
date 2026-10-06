import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';
import { setAIProvider, getAIProvider } from '../../src/server/ai/GeminiAIProvider.js';
import { interactionStorage } from '../../src/server/storage/InMemoryInteractionStorage.js';
import { assessmentStorage } from '../../src/server/storage/InMemoryAssessmentStorage.js';
import { AssessmentRecord } from '../../src/shared/types/index.js';

const app = createApp();

describe('Server API Endpoints Route Skeletons', () => {
  const originalProvider = getAIProvider();

  const mockProvider = {
    understandQuestion: async (p: any) => ({
      originalQuestion: p.question,
      normalizedQuestion: p.question,
      category: 'التزكية',
      task: 'شروط التوبة',
      topic: 'التوبة',
      userGoal: 'معرفة الشروط',
      claims: ['الإقلاع والندم والعزم شروط لصحة التوبة'],
      requestedEvidence: ['المحتوى الإسلامي'],
      needsClarification: false,
      isPersonalFatwa: false,
    }),
    verifyEvidence: async (p: any) => ({
      chunkId: p.candidateChunk?.chunkId || 'chk_1',
      claimId: p.claimId || 'claim_1',
      sourceId: 'src_ic',
      verificationStatus: 'SUPPORTED' as const,
      confidence: 0.95,
      relation: 'مدعوم صراحة في النص',
    }),
    generateGroundedAnswer: async () => ({
      answer: 'شروط التوبة الصادقة ثلاثة: الإقلاع عن الذنب، والندم على ما فات، والعزم على عدم الرجوع إليه.',
      citedChunkIds: ['chk_1'],
      inferredClaims: [],
    }),
    validateGrounding: async () => ({
      isGrounded: true,
      unsupportedClaims: [],
      remedyAction: 'ACCEPT' as const,
    }),
    generateFollowUps: async (p: any) => [
      {
        id: `fu_${p.parentInteractionId}_1`,
        question: 'ما دلالة الندم في صحة التوبة؟',
        type: 'مفهوم مرتبط',
        origin: 'DEEP_LEARNING' as const,
        parentInteractionId: p.parentInteractionId,
      },
    ],
    generateAssessment: async (p: any) => ({
      assessmentId: `ass_${Date.now()}`,
      sessionId: p.sessionId,
      status: 'READY' as const,
      questions: [
        {
          questionId: 'q1',
          question: 'ما هو الشرط الأساسي للتوبة الصادقة؟',
          options: ['الندم والإقلاع والعزم', 'التأجيل', 'التمني', 'الغفلة'],
          correctAnswer: 0,
          explanation: 'الندم ركن التوبة الأعظم',
          sourceRecordIds: ['int_1'],
        },
      ],
      totalQuestions: 1,
      createdAt: new Date().toISOString(),
    }),
    generateReport: async (p: any) => ({
      reportId: `rep_${Date.now()}`,
      sessionId: p.sessionId,
      assessmentId: p.assessmentRecord.assessmentId,
      generatedAt: new Date().toISOString(),
      overallScore: 100,
      journeySummary: {
        totalInteractions: 20,
        verifiedCount: 20,
        directQuestionsCount: 15,
        deepLearningQuestionsCount: 5,
        primaryCategories: ['التزكية', 'العقيدة'],
      },
      topicPerformance: [],
      strengths: ['استيعاب شروط التوبة'],
      areasForReview: [],
      narrativeSummary: 'تقرير معرفي متكامل مبني على رحلة المتعلم.',
    }),
  };

  beforeEach(() => {
    setAIProvider(mockProvider as any);
  });

  afterEach(() => {
    setAIProvider(originalProvider);
  });

  it('GET /api/health should return 200 with platform status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.platform).toContain('Mishkat');
  });

  describe('POST /api/ask', () => {
    it('should return 200 with structured AskResponse on valid user question', async () => {
      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'session_test_01',
          question: 'ما هي شروط التوبة الصادقة؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.interactionId).toBeDefined();
      expect(res.body.data.question).toBe('ما هي شروط التوبة الصادقة؟');
      expect(res.body.data.status).toBe('ANSWERED');
    });

    it('should return 400 when question is empty or missing', async () => {
      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'session_test_01',
          question: '',
          origin: 'USER',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/interactions/:id', () => {
    it('should return 200 with interaction data', async () => {
      const res = await request(app).get('/api/interactions/int_sample_01');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.interactionId).toBe('int_sample_01');
      expect(res.body.data.sources.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/deep-learning/:interactionId', () => {
    it('should return contextual follow-up questions', async () => {
      const res = await request(app).get('/api/deep-learning/int_sample_01');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parentInteractionId).toBe('int_sample_01');
      expect(res.body.data.followUps.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/journey', () => {
    it('should return journey dashboard metrics and assessment eligibility', async () => {
      const res = await request(app).get('/api/journey?sessionId=sess_1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assessmentEligibility).toBeDefined();
      expect(res.body.data.assessmentEligibility.requiredCount).toBe(20);
    });
  });

  describe('GET /api/assessment/status and POST /api/assessment/generate', () => {
    it('status should report current count and eligibility', async () => {
      const res = await request(app).get('/api/assessment/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiredCount).toBe(20);
    });

    it('generate returns 403 when session has fewer than 20 eligible records', async () => {
      const res = await request(app)
        .post('/api/assessment/generate')
        .send({ sessionId: 'sess_locked_test' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ASSESSMENT_NOT_ELIGIBLE');
    });

    it('generate returns questions without leaking answer key when session is eligible', async () => {
      const sessionId = 'sess_unlocked_test';
      // Seed 20 eligible interactions
      for (let i = 1; i <= 20; i++) {
        interactionStorage.set(`int_seed_${i}`, {
          interactionId: `int_seed_${i}`,
          sessionId,
          question: `سؤال محقق رقم ${i}`,
          answer: `إجابة مؤصلة رقم ${i}`,
          status: 'ANSWERED',
          origin: 'USER',
          createdAt: new Date().toISOString(),
          claims: [`دعوى رقم ${i}`],
          evidence: [
            {
              evidenceId: `ev_${i}`,
              claimId: `claim_${i}`,
              sourceId: 'src_ic',
              chunkId: `chk_${i}`,
              relation: 'مدعوم',
              verificationStatus: 'SUPPORTED',
              confidence: 0.9,
            },
          ],
          sources: [],
          citations: [
            {
              chunkId: `chk_${i}`,
              sourceId: 'src_ic',
              sourceName: 'المحتوى الإسلامي',
              title: 'تأصيل',
            },
          ],
        });
      }

      const res = await request(app)
        .post('/api/assessment/generate')
        .send({ sessionId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.questions.length).toBeGreaterThan(0);
      for (const q of res.body.data.questions) {
        expect((q as any).correctAnswer).toBeUndefined();
        expect((q as any).explanation).toBeUndefined();
      }
    });

    it('submit should evaluate answers and return server score', async () => {
      const sampleAssessment: AssessmentRecord = {
        assessmentId: 'ass_100',
        sessionId: 'sess_unlocked_test',
        status: 'READY',
        createdAt: new Date().toISOString(),
        totalQuestions: 3,
        questions: [
          {
            questionId: 'q1',
            question: 'سؤال 1',
            options: ['أ', 'ب', 'ج', 'د'],
            correctAnswer: 0,
            explanation: 'شرح 1',
            sourceRecordIds: ['int_1'],
          },
          {
            questionId: 'q2',
            question: 'سؤال 2',
            options: ['أ', 'ب', 'ج', 'د'],
            correctAnswer: 1,
            explanation: 'شرح 2',
            sourceRecordIds: ['int_2'],
          },
          {
            questionId: 'q3',
            question: 'سؤال 3',
            options: ['أ', 'ب', 'ج', 'د'],
            correctAnswer: 2,
            explanation: 'شرح 3',
            sourceRecordIds: ['int_3'],
          },
        ],
      };
      assessmentStorage.set('ass_100', sampleAssessment);

      const res = await request(app)
        .post('/api/assessment/ass_100/submit')
        .send({
          answers: { q1: 0, q2: 1, q3: 0 },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(2);
      expect(res.body.data.percentage).toBe(67);
    });
  });

  describe('GET /api/sources', () => {
    it('should return real classical Islamic trusted sources', async () => {
      const res = await request(app).get('/api/sources');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const quranpedia = res.body.data.find((s: { sourceId: string }) => s.sourceId === 'src_quranpedia');
      expect(quranpedia).toBeDefined();
      expect(quranpedia.isVerified).toBe(true);
    });
  });

  describe('GET /api/specialist', () => {
    it('should return official fatwa entities and religious disclaimer', async () => {
      const res = await request(app).get('/api/specialist');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.disclaimer).toBeDefined();
      expect(res.body.data.officialEntities.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/report', () => {
    it('should return 400 REPORT_NOT_READY when assessment is not completed', async () => {
      const res = await request(app).get('/api/report?sessionId=sess_no_assessment');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('REPORT_NOT_READY');
    });

    it('should return structured knowledge report when assessment is completed', async () => {
      const sessionId = 'sess_report_ready';
      const assessmentId = 'ass_completed_sample';

      assessmentStorage.set(assessmentId, {
        assessmentId,
        sessionId,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        score: 5,
        totalQuestions: 5,
        questions: [],
      });

      const res = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.journeySummary).toBeDefined();
      expect(res.body.data.overallScore).toBeDefined();
    });
  });
});
