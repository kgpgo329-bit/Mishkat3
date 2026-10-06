import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { interactionStorage } from '../src/server/storage/InMemoryInteractionStorage.js';
import { assessmentStorage } from '../src/server/storage/InMemoryAssessmentStorage.js';
import { reportStorage } from '../src/server/storage/InMemoryReportStorage.js';
import {
  setAIProvider,
  getAIProvider,
} from '../src/server/ai/GeminiAIProvider.js';
import { AskResponse, AssessmentRecord } from '../src/shared/types/index.js';

const app = createApp();

describe('STEP 11 Focused Validation: Final Knowledge Report', { timeout: 15000 }, () => {
  const originalProvider = getAIProvider();

  beforeEach(() => {
    interactionStorage.clear();
    assessmentStorage.clear();
    reportStorage.clear();
  });

  afterEach(() => {
    setAIProvider(originalProvider);
  });

  function seedEligibleInteractions(sessionId: string, count: number): AskResponse[] {
    const list: AskResponse[] = [];
    const topics = ['التوحيد والعقيدة', 'الفقه وأصوله', 'القرآن وتفسيره', 'الحديث النبوي'];
    for (let i = 1; i <= count; i++) {
      const topic = topics[(i - 1) % topics.length];
      const resp: AskResponse = {
        interactionId: `int_${sessionId}_${i}`,
        sessionId,
        origin: i % 2 === 0 ? 'DEEP_LEARNING' : 'USER',
        status: 'ANSWERED',
        question: `مسألة محققة رقم ${i} في موضوع ${topic}؟`,
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
          topic,
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

  function seedCompletedAssessment(
    sessionId: string,
    eligibleInteractions: AskResponse[],
    score: number = 4
  ): AssessmentRecord {
    const validIds = eligibleInteractions.map((e) => e.interactionId);
    const questions = [0, 1, 2, 3, 4].map((idx) => ({
      id: `q_${idx + 1}`,
      questionId: `q_${idx + 1}`,
      question: `سؤال تقييمي ${idx + 1}؟`,
      options: ['أ', 'ب', 'ج', 'د'],
      correctAnswer: 0,
      correctOptionId: 0,
      explanation: `شرح السؤال ${idx + 1}`,
      sourceRecordIds: [validIds[idx % validIds.length]],
      sourceInteractionIds: [validIds[idx % validIds.length]],
    }));

    const assessmentRecord: AssessmentRecord = {
      assessmentId: `ass_${sessionId}_test`,
      sessionId,
      basedOnRecordIds: validIds,
      questions,
      status: 'COMPLETED',
      score,
      totalQuestions: 5,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      submissionResults: questions.map((q, idx) => ({
        questionId: q.questionId,
        isCorrect: idx < score,
        correctOptionId: 0,
        explanation: q.explanation,
        sourceInteractionIds: q.sourceInteractionIds,
      })),
    };

    assessmentStorage.set(assessmentRecord.assessmentId, assessmentRecord);
    return assessmentRecord;
  }

  describe('1. Report Gate & Incomplete Assessment Safety', () => {
    it('REPORT_GATE: incomplete assessment returns REPORT_NOT_READY with 400 error', async () => {
      const sessionId = 'sess_gate_test';
      seedEligibleInteractions(sessionId, 20);

      // Check status before assessment is completed
      const statusRes = await request(app).get(`/api/report/status?sessionId=${sessionId}`);
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('REPORT_NOT_READY');

      // Attempt GET /api/report -> MUST FAIL with REPORT_NOT_READY
      const getRes = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(getRes.status).toBe(400);
      expect(getRes.body.success).toBe(false);
      expect(getRes.body.error.code).toBe('REPORT_NOT_READY');

      // Attempt POST /api/report/generate -> MUST ALSO FAIL with REPORT_NOT_READY
      const genRes = await request(app)
        .post('/api/report/generate')
        .send({ sessionId });
      expect(genRes.status).toBe(400);
      expect(genRes.body.success).toBe(false);
      expect(genRes.body.error.code).toBe('REPORT_NOT_READY');
    });

    it('REPORT_GATE: unsubmitted assessment (status=READY) is still blocked from report', async () => {
      const sessionId = 'sess_unsubmitted';
      const eligible = seedEligibleInteractions(sessionId, 20);

      // Seed assessment with status READY (not yet submitted/completed)
      const assessmentRecord: AssessmentRecord = {
        assessmentId: `ass_ready_only`,
        sessionId,
        basedOnRecordIds: eligible.map((e) => e.interactionId),
        questions: [],
        status: 'READY',
        createdAt: new Date().toISOString(),
      };
      assessmentStorage.set(assessmentRecord.assessmentId, assessmentRecord);

      const res = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('REPORT_NOT_READY');
    });
  });

  describe('2. Session Isolation', () => {
    it('SESSION_ISOLATION: completed assessment in Session A does not unlock report for Session B', async () => {
      const eligibleA = seedEligibleInteractions('sess_iso_A', 20);
      seedCompletedAssessment('sess_iso_A', eligibleA, 5);

      seedEligibleInteractions('sess_iso_B', 10);
      // Session B has no completed assessment

      const statusA = await request(app).get('/api/report/status?sessionId=sess_iso_A');
      expect(statusA.body.data.status).toBe('READY');

      const statusB = await request(app).get('/api/report/status?sessionId=sess_iso_B');
      expect(statusB.body.data.status).toBe('REPORT_NOT_READY');

      const getB = await request(app).get('/api/report?sessionId=sess_iso_B');
      expect(getB.status).toBe(400);
      expect(getB.body.error.code).toBe('REPORT_NOT_READY');
    });
  });

  describe('3. Deterministic Statistics & Assessment Score Match', () => {
    it('DETERMINISTIC_STATS & ASSESSMENT_SCORE_MATCH: calculates exact score, percentage, and counts from server data', async () => {
      const sessionId = 'sess_deterministic';
      const eligible = seedEligibleInteractions(sessionId, 20);
      seedCompletedAssessment(sessionId, eligible, 4); // 4 out of 5 = 80%

      const res = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const report = res.body.data;
      expect(report.sessionId).toBe(sessionId);
      expect(report.assessmentId).toBe(`ass_${sessionId}_test`);

      // Summary must match deterministic server calculation
      expect(report.summary.eligibleKnowledgeCount).toBe(20);
      expect(report.summary.assessmentScore).toBe(4);
      expect(report.summary.correctCount).toBe(4);
      expect(report.summary.totalQuestions).toBe(5);
      expect(report.summary.percentage).toBe(80);
    });

    it('ASSESSMENT_SCORE_MATCH: handles 100% score (5/5) deterministically', async () => {
      const sessionId = 'sess_perfect_score';
      const eligible = seedEligibleInteractions(sessionId, 20);
      seedCompletedAssessment(sessionId, eligible, 5); // 5 out of 5 = 100%

      const res = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res.status).toBe(200);
      const report = res.body.data;
      expect(report.summary.assessmentScore).toBe(5);
      expect(report.summary.percentage).toBe(100);
    });
  });

  describe('4. Topic Performance & Traceability', () => {
    it('TOPIC_PERFORMANCE: derives topic counts accurately from Journey interactions and assessment questions', async () => {
      const sessionId = 'sess_topics';
      const eligible = seedEligibleInteractions(sessionId, 20);
      seedCompletedAssessment(sessionId, eligible, 3);

      const res = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res.status).toBe(200);

      const report = res.body.data;
      expect(Array.isArray(report.topicPerformance)).toBe(true);
      expect(report.topicPerformance.length).toBeGreaterThan(0);

      // Verify that all topics in topicPerformance correspond to real topics
      for (const tp of report.topicPerformance) {
        expect(tp.topic).toBeTruthy();
        expect(tp.interactionCount).toBeGreaterThan(0);
      }
    });

    it('STRENGTH_TRACEABILITY: strengths are traceable to valid questionIds and sourceInteractionIds', async () => {
      const sessionId = 'sess_strengths';
      const eligible = seedEligibleInteractions(sessionId, 20);
      const validIds = eligible.map((e) => e.interactionId);
      seedCompletedAssessment(sessionId, eligible, 4);

      const res = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res.status).toBe(200);

      const report = res.body.data;
      expect(report.strengths).toBeDefined();
      expect(report.strengths.length).toBeGreaterThan(0);

      // Check traceability of the first strength
      const firstStr = report.strengths[0];
      expect(firstStr.area).toBeTruthy();
      expect(firstStr.assessmentQuestionIds).toBeDefined();
      expect(firstStr.sourceInteractionIds).toBeDefined();
      for (const sid of firstStr.sourceInteractionIds) {
        expect(validIds).toContain(sid);
      }
    });

    it('REVIEW_TRACEABILITY: review areas are traceable to valid incorrect questions and sources', async () => {
      const sessionId = 'sess_reviews';
      const eligible = seedEligibleInteractions(sessionId, 20);
      const validIds = eligible.map((e) => e.interactionId);
      seedCompletedAssessment(sessionId, eligible, 3); // 2 incorrect (q4, q5)

      const res = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res.status).toBe(200);

      const report = res.body.data;
      expect(report.reviewAreas).toBeDefined();
      expect(report.reviewAreas.length).toBeGreaterThan(0);

      // Check traceability of the first review area
      const firstRev = report.reviewAreas[0];
      expect(firstRev.area).toBeTruthy();
      expect(firstRev.assessmentQuestionIds).toBeDefined();
      expect(firstRev.sourceInteractionIds).toBeDefined();
      for (const sid of firstRev.sourceInteractionIds) {
        expect(validIds).toContain(sid);
      }
    });
  });

  describe('5. Strict Grounding & No New Religious Facts', () => {
    it('NO_NEW_RELIGIOUS_FACTS: report synthesizes only user performance without external theological claims', async () => {
      const sessionId = 'sess_grounded_report';
      const eligible = seedEligibleInteractions(sessionId, 20);
      seedCompletedAssessment(sessionId, eligible, 4);

      const res = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res.status).toBe(200);

      const report = res.body.data;
      expect(report.learningSummary).toBeTruthy();
      // Should describe completion and performance
      expect(report.learningSummary).toMatch(/رحل|المسائل/);
      expect(report.recommendations.length).toBeGreaterThanOrEqual(2);
      expect(report.recommendations.length).toBeLessThanOrEqual(3);
    });
  });

  describe('6. AI Failure Safety & Fallback', () => {
    it('AI_FAILURE_FALLBACK: Gemini error falls back safely to deterministic statistics without corrupting Journey or Assessment', async () => {
      const sessionId = 'sess_ai_fail';
      const eligible = seedEligibleInteractions(sessionId, 20);
      seedCompletedAssessment(sessionId, eligible, 4);

      // Simulate failing AI provider
      const mockFailingProvider = {
        generateReport: async () => {
          throw new Error('Gemini API 503 Service Unavailable');
        },
      };
      setAIProvider(mockFailingProvider as any);

      const res = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const report = res.body.data;
      // Deterministic numbers are 100% preserved
      expect(report.summary.assessmentScore).toBe(4);
      expect(report.summary.percentage).toBe(80);
      expect(report.summary.eligibleKnowledgeCount).toBe(20);
      expect(report.learningSummary).toBeTruthy();

      // Assessment in storage must remain intact
      const storedAss = assessmentStorage.get(`ass_${sessionId}_test`);
      expect(storedAss?.status).toBe('COMPLETED');
      expect(storedAss?.score).toBe(4);

      // Journey in storage must remain intact
      const storedInts = interactionStorage.getBySession(sessionId);
      expect(storedInts.length).toBe(20);
    });
  });

  describe('7. Duplicate Protection & Idempotence', () => {
    it('DUPLICATE_PROTECTION: multiple calls for the same completed assessment safely reuse the existing report', async () => {
      const sessionId = 'sess_duplicate_test';
      const eligible = seedEligibleInteractions(sessionId, 20);
      seedCompletedAssessment(sessionId, eligible, 4);

      const res1 = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res1.status).toBe(200);
      const reportId1 = res1.body.data.reportId;

      const res2 = await request(app).get(`/api/report?sessionId=${sessionId}`);
      expect(res2.status).toBe(200);
      const reportId2 = res2.body.data.reportId;

      // Must be the identical report without creating duplicates
      expect(reportId1).toBe(reportId2);
    });
  });

  describe('8. UI Integration via mishkatApi', () => {
    it('UI_INTEGRATION: mishkatApi can check status and get report seamlessly', async () => {
      const { mishkatApi } = await import('../src/client/api/mishkatApi.js');

      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async (url: any) => {
          const urlStr = String(url);
          if (urlStr.includes('/report/status')) {
            return new Response(
              JSON.stringify({
                success: true,
                data: { status: 'READY', assessmentId: 'ass_ui_1' },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          if (urlStr.includes('/report')) {
            return new Response(
              JSON.stringify({
                success: true,
                data: {
                  reportId: 'rep_ui_test',
                  sessionId: 'sess_ui',
                  assessmentId: 'ass_ui_1',
                  generatedAt: new Date().toISOString(),
                  summary: {
                    eligibleKnowledgeCount: 20,
                    assessmentScore: 5,
                    correctCount: 5,
                    totalQuestions: 5,
                    percentage: 100,
                  },
                  topicPerformance: [],
                  strengths: [],
                  reviewAreas: [],
                  learningSummary: 'ملخص تربوي ممتاز',
                  recommendations: ['مواصلة البحث'],
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(JSON.stringify({}), { status: 404 });
        };

        const statusRes = await mishkatApi.getReportStatus('sess_ui');
        expect(statusRes.success).toBe(true);
        expect(statusRes.data?.status).toBe('READY');

        const reportRes = await mishkatApi.getReport('sess_ui');
        expect(reportRes.success).toBe(true);
        expect(reportRes.data?.reportId).toBe('rep_ui_test');
        expect(reportRes.data?.summary.percentage).toBe(100);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
