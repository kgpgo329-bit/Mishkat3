import {
  AskRequest,
  AskResponse,
  JourneyDashboardData,
  DeepLearningResponse,
  AssessmentEligibilityInfo,
  AssessmentClientView,
  AssessmentSubmissionRequest,
  AssessmentSubmissionResult,
  FinalReportRecord,
  ReportEligibilityInfo,
  TrustedSource,
  SpecialistReferralResponse,
  ApiResponse,
  IMishkatApiClient,
} from '../../shared/types/index.js';

const SESSION_STORAGE_KEY = 'mishkat_session_id';

/**
 * Creates or reuses a persistent sessionId on the client.
 */
export function getOrCreateClientSessionId(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    let sid = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      window.localStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  }
  return 'sess_default_session';
}

class MishkatApiClient implements IMishkatApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  getSessionId(): string {
    return getOrCreateClientSessionId();
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      const json = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: json.error || {
            code: 'REQUEST_FAILED',
            message: `Request failed with status ${response.status}`,
          },
        };
      }

      return json;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network connection error';
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message,
        },
      };
    }
  }

  /**
   * Canonical question pipeline entry point.
   * Both USER and DEEP_LEARNING origins use this same method.
   */
  async askQuestion(req: AskRequest): Promise<ApiResponse<AskResponse>> {
    const payload: AskRequest = {
      ...req,
      sessionId: req.sessionId || this.getSessionId(),
    };
    return this.request<AskResponse>('/ask', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getInteraction(id: string): Promise<ApiResponse<AskResponse>> {
    return this.request<AskResponse>(`/interactions/${encodeURIComponent(id)}`);
  }

  async getJourney(sessionId?: string): Promise<ApiResponse<JourneyDashboardData>> {
    const sid = sessionId || this.getSessionId();
    return this.request<JourneyDashboardData>(`/journey?sessionId=${encodeURIComponent(sid)}`);
  }

  async getDeepLearning(interactionId: string): Promise<ApiResponse<DeepLearningResponse>> {
    return this.request<DeepLearningResponse>(`/deep-learning/${encodeURIComponent(interactionId)}`);
  }

  async getAssessmentStatus(sessionId?: string): Promise<ApiResponse<AssessmentEligibilityInfo>> {
    const sid = sessionId || this.getSessionId();
    return this.request<AssessmentEligibilityInfo>(`/assessment/status?sessionId=${encodeURIComponent(sid)}`);
  }

  async generateAssessment(sessionId?: string): Promise<ApiResponse<AssessmentClientView>> {
    const sid = sessionId || this.getSessionId();
    return this.request<AssessmentClientView>('/assessment/generate', {
      method: 'POST',
      body: JSON.stringify({ sessionId: sid }),
    });
  }

  async submitAssessment(
    id: string,
    answers: AssessmentSubmissionRequest
  ): Promise<ApiResponse<AssessmentSubmissionResult>> {
    return this.request<AssessmentSubmissionResult>(`/assessment/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
      body: JSON.stringify(answers),
    });
  }

  async getReportStatus(sessionId?: string): Promise<ApiResponse<ReportEligibilityInfo>> {
    const sid = sessionId || this.getSessionId();
    return this.request<ReportEligibilityInfo>(`/report/status?sessionId=${encodeURIComponent(sid)}`);
  }

  async generateReport(sessionId?: string): Promise<ApiResponse<FinalReportRecord>> {
    const sid = sessionId || this.getSessionId();
    return this.request<FinalReportRecord>('/report/generate', {
      method: 'POST',
      body: JSON.stringify({ sessionId: sid }),
    });
  }

  async getReport(sessionId?: string): Promise<ApiResponse<FinalReportRecord>> {
    const sid = sessionId || this.getSessionId();
    return this.request<FinalReportRecord>(`/report?sessionId=${encodeURIComponent(sid)}`);
  }

  async getSources(): Promise<ApiResponse<TrustedSource[]>> {
    return this.request<TrustedSource[]>('/sources');
  }

  async getSpecialistReferral(): Promise<ApiResponse<SpecialistReferralResponse>> {
    return this.request<SpecialistReferralResponse>('/specialist');
  }
}

export const mishkatApi = new MishkatApiClient();
