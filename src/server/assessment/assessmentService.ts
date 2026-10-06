import {
  AssessmentEligibilityInfo,
  AssessmentClientView,
  AssessmentSubmissionResult,
  AssessmentQuestionClient,
} from '../../shared/types/index.js';
import { MishkatError } from '../../shared/errors/MishkatError.js';
import { getAIProvider } from '../ai/GeminiAIProvider.js';
import { AIProvider } from '../ai/AIProvider.js';
import { interactionStorage } from '../storage/InMemoryInteractionStorage.js';
import { assessmentStorage } from '../storage/InMemoryAssessmentStorage.js';
import { isEligibleForAssessment, toInteractionRecord } from '../journey/knowledgeJourneyService.js';

export class AssessmentService {
  private aiProvider?: AIProvider;
  private intStorage: typeof interactionStorage;
  private assStorage: typeof assessmentStorage;

  constructor(
    aiProvider?: AIProvider,
    intStorage?: typeof interactionStorage,
    assStorage?: typeof assessmentStorage
  ) {
    this.aiProvider = aiProvider;
    this.intStorage = intStorage || interactionStorage;
    this.assStorage = assStorage || assessmentStorage;
  }

  private getProvider(): AIProvider {
    return this.aiProvider || getAIProvider();
  }

  async getStatus(sessionId: string): Promise<AssessmentEligibilityInfo> {
    const rawList = this.intStorage.getBySession(sessionId);
    const eligibleList = rawList.filter(isEligibleForAssessment);
    const currentCount = eligibleList.length;
    const requiredCount = 20;
    const remainingCount = Math.max(0, requiredCount - currentCount);

    return {
      status: currentCount >= requiredCount ? 'READY' : 'LOCKED',
      requiredCount,
      currentCount,
      remainingCount,
    };
  }

  async generateAssessment(sessionId: string): Promise<AssessmentClientView> {
    const status = await this.getStatus(sessionId);
    if (status.status !== 'READY') {
      throw new MishkatError(
        'ASSESSMENT_NOT_ELIGIBLE',
        `التقييم مغلق. يتطلب إتمام 20 مسألة محققة (المكتمل حالياً: ${status.currentCount}).`,
        403,
        {
          eligibleCount: status.currentCount,
          target: status.requiredCount,
          remaining: status.remainingCount,
        }
      );
    }

    const rawList = this.intStorage.getBySession(sessionId);
    const eligibleInteractions = rawList
      .filter(isEligibleForAssessment)
      .map((item) => toInteractionRecord(item, sessionId));

    const assessmentRecord = await this.getProvider().generateAssessment({
      sessionId,
      eligibleInteractions,
      questionCount: 5,
    });

    // Save server-side record with answer keys
    this.assStorage.set(assessmentRecord.assessmentId, assessmentRecord);

    // Return client view with answer keys strictly omitted
    const clientQuestions: AssessmentQuestionClient[] = assessmentRecord.questions.map((q) => ({
      questionId: q.questionId,
      question: q.question,
      options: q.options,
    }));

    return {
      assessmentId: assessmentRecord.assessmentId,
      sessionId: assessmentRecord.sessionId,
      questions: clientQuestions,
      status: 'READY',
      totalQuestions: clientQuestions.length,
    };
  }

  async submitAssessment(
    assessmentId: string,
    answers: Record<string, number>
  ): Promise<AssessmentSubmissionResult> {
    const assessment = this.assStorage.get(assessmentId);
    if (!assessment) {
      throw MishkatError.notFound('لم يتم العثور على التقييم المطلوب');
    }

    let correctCount = 0;
    const results = assessment.questions.map((q) => {
      const selectedIndex = answers[q.questionId] ?? answers[q.id || ''];
      const isCorrect = selectedIndex === q.correctAnswer;
      if (isCorrect) {
        correctCount++;
      }

      return {
        questionId: q.questionId,
        isCorrect,
        correctOptionId: q.correctAnswer,
        explanation: q.explanation,
        sourceInteractionIds: q.sourceRecordIds || q.sourceInteractionIds || [],
      };
    });

    const totalQuestions = assessment.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    assessment.status = 'COMPLETED';
    assessment.score = correctCount;
    assessment.completedAt = new Date().toISOString();
    assessment.submissionResults = results;
    assessment.userAnswers = answers;
    this.assStorage.set(assessmentId, assessment);

    return {
      assessmentId,
      sessionId: assessment.sessionId,
      score: correctCount,
      correctCount,
      totalQuestions,
      percentage,
      results,
      conceptPerformance: results.map((r) => ({
        questionId: r.questionId,
        isCorrect: r.isCorrect,
        explanation: r.explanation,
      })),
      completedAt: assessment.completedAt,
    };
  }
}
