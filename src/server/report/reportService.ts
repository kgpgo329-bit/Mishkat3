import {
  FinalReportRecord,
  ReportEligibilityInfo,
} from '../../shared/types/index.js';
import { MishkatError } from '../../shared/errors/MishkatError.js';
import { getAIProvider, GeminiAIProvider } from '../ai/GeminiAIProvider.js';
import { AIProvider } from '../ai/AIProvider.js';
import { interactionStorage } from '../storage/InMemoryInteractionStorage.js';
import { assessmentStorage } from '../storage/InMemoryAssessmentStorage.js';
import { reportStorage, InMemoryReportStorage } from '../storage/InMemoryReportStorage.js';
import { isEligibleForAssessment, toInteractionRecord } from '../journey/knowledgeJourneyService.js';

export class ReportService {
  private aiProvider?: AIProvider;
  private intStorage: typeof interactionStorage;
  private assStorage: typeof assessmentStorage;
  private repStorage: InMemoryReportStorage;

  constructor(
    aiProvider?: AIProvider,
    intStorage?: typeof interactionStorage,
    assStorage?: typeof assessmentStorage,
    repStorage?: InMemoryReportStorage
  ) {
    this.aiProvider = aiProvider;
    this.intStorage = intStorage || interactionStorage;
    this.assStorage = assStorage || assessmentStorage;
    this.repStorage = repStorage || reportStorage;
  }

  private getProvider(): AIProvider {
    return this.aiProvider || getAIProvider();
  }

  async getStatus(sessionId: string): Promise<ReportEligibilityInfo> {
    const assessment = this.assStorage.getLatestCompletedBySession(sessionId);
    if (!assessment || assessment.status !== 'COMPLETED' || typeof assessment.score !== 'number') {
      return {
        status: 'REPORT_NOT_READY',
        reason: 'يتطلب إتمام التقييم المعرفي أولاً لفتح التقرير النهائي.',
      };
    }

    return {
      status: 'READY',
      assessmentId: assessment.assessmentId,
    };
  }

  async getReport(sessionId: string): Promise<FinalReportRecord> {
    // 1. Check if report already generated and cached for the session
    const existing = await this.repStorage.getLatestReport(sessionId);
    if (existing) {
      return existing;
    }

    // 2. Otherwise generate if assessment is ready
    return this.generateReport(sessionId);
  }

  async generateReport(sessionId: string): Promise<FinalReportRecord> {
    // 1. REPORT GATE: Must have a completed assessment belonging to current session
    const assessment = this.assStorage.getLatestCompletedBySession(sessionId);
    if (!assessment || assessment.status !== 'COMPLETED' || typeof assessment.score !== 'number') {
      throw new MishkatError(
        'REPORT_NOT_READY',
        'التقرير غير جاهز. يتطلب إتمام التقييم المعرفي للمستخدم أولاً.',
        400,
        { sessionId }
      );
    }

    // 2. DUPLICATE PROTECTION: Avoid generating duplicate reports for the same assessment
    const existingForAssessment = this.repStorage.getByAssessmentId(assessment.assessmentId);
    if (existingForAssessment) {
      return existingForAssessment;
    }

    // 3. ALLOWED DATA: Filter strictly for eligible records in the current session
    const rawInteractions = this.intStorage.getBySession(sessionId);
    const eligibleInteractions = rawInteractions
      .filter(isEligibleForAssessment)
      .map((item) => toInteractionRecord(item, sessionId));

    // 4. SYNTHESIS WITH AI FAILURE SAFETY:
    let report: FinalReportRecord;
    try {
      report = await this.getProvider().generateReport({
        sessionId,
        assessmentRecord: assessment,
        eligibleInteractions,
        assessmentScorePercentage:
          assessment.questions.length > 0
            ? Math.round(((assessment.score ?? 0) / assessment.questions.length) * 100)
            : 0,
      });
    } catch (_err) {
      // FAILURE ISOLATION: Fall back safely without modifying Journey or Assessment
      const fallbackProvider = new GeminiAIProvider({ apiKey: '' });
      report = await fallbackProvider.generateReport({
        sessionId,
        assessmentRecord: assessment,
        eligibleInteractions,
        assessmentScorePercentage:
          assessment.questions.length > 0
            ? Math.round(((assessment.score ?? 0) / assessment.questions.length) * 100)
            : 0,
      });
    }

    // 5. Store report in temporary in-memory storage
    await this.repStorage.saveReport(report);

    return report;
  }
}
