export interface ReportSummary {
  eligibleKnowledgeCount: number;
  assessmentScore: number;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
}

export interface ReportTopicPerformance {
  topic: string;
  interactionCount: number;
  correctCount?: number;
  totalQuestions?: number;
}

export interface ReportFeedbackArea {
  area: string;
  sourceInteractionIds?: string[];
  assessmentQuestionIds?: string[];
}

export interface FinalReportRecord {
  reportId: string;
  sessionId: string;
  assessmentId: string;
  generatedAt: string;

  // Step 11 Explicit Specifications
  summary: ReportSummary;
  topicPerformance: ReportTopicPerformance[];
  strengths: ReportFeedbackArea[];
  reviewAreas: ReportFeedbackArea[];
  learningSummary: string;
  recommendations: string[];

  // Compatibility & UI fields
  journeySummary?: {
    totalQuestions: number;
    verifiedConceptsCount: number;
    domainBreakdown: Record<string, number>;
    originBreakdown: {
      user: number;
      deepLearning: number;
    };
    narrative: string;
  };
  comprehensionAssessment?: {
    scorePercentage: number;
    correctCount: number;
    totalQuestions: number;
    strengths: string[];
    growthAreas: string[];
    narrative: string;
  };
  referencedSources?: Array<{
    sourceId: string;
    sourceName: string;
    category: string;
  }>;
}

export interface ReportEligibilityInfo {
  status: 'READY' | 'REPORT_NOT_READY';
  assessmentId?: string;
  reason?: string;
}
