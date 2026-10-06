import { describe, it, expect } from 'vitest';
import {
  AskResponse,
  JourneyDashboardData,
  DeepLearningResponse,
  AssessmentClientView,
  AssessmentSubmissionResult,
  FinalReportRecord,
  SpecialistReferralResponse,
} from '../../src/shared/types/index.js';

describe('API Contract Shape Invariants', () => {
  it('AskResponse must enforce status and interactionId', () => {
    const mockResponse: AskResponse = {
      interactionId: 'int_sample_01',
      status: 'ANSWERED',
      question: 'ما هي شروط لا إله إلا الله؟',
      answer: 'شروط لا إله إلا الله سبعة: العلم، واليقين، والإخلاص، والصدق، والمحبة، والانقياد، والقبول.',
      claims: ['العلم المنافي للجهل', 'اليقين المنافي للشك'],
      evidence: [],
      sources: [],
      followUps: [],
      journeyState: {
        totalInteractions: 1,
        verifiedCount: 1,
        assessmentEligible: false,
      },
    };

    expect(mockResponse.interactionId).toBeDefined();
    expect(mockResponse.status).toBe('ANSWERED');
    expect(mockResponse.journeyState?.assessmentEligible).toBe(false);
  });

  it('AssessmentClientView must NEVER contain correctAnswer or explanation fields', () => {
    const clientView: AssessmentClientView = {
      assessmentId: 'ass_test',
      sessionId: 'sess_1',
      status: 'READY',
      totalQuestions: 1,
      questions: [
        {
          questionId: 'q1',
          question: 'ما هو أصل الدين؟',
          options: ['التوحيد', 'الأخلاق'],
        },
      ],
    };

    const questionKeys = Object.keys(clientView.questions[0]);
    expect(questionKeys).not.toContain('correctAnswer');
    expect(questionKeys).not.toContain('explanation');
  });

  it('JourneyDashboardData must contain accurate metric fields without fabrication', () => {
    const journey: JourneyDashboardData = {
      sessionId: 'session_real',
      allInteractions: [],
      directQuestionCount: 5,
      deepLearningQuestionCount: 3,
      verifiedKnowledgeCount: 8,
      assessmentEligibility: {
        status: 'LOCKED',
        requiredCount: 20,
        currentCount: 8,
        progressPercentage: 40,
      },
      domainDistribution: { 'العقيدة': 5, 'الفقه': 3 },
      originDistribution: { USER: 5, DEEP_LEARNING: 3 },
    };

    expect(journey.directQuestionCount + journey.deepLearningQuestionCount).toBe(8);
    expect(journey.assessmentEligibility.status).toBe('LOCKED');
    expect(journey.assessmentEligibility.requiredCount).toBe(20);
  });
});
