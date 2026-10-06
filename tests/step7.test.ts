import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import {
  GeminiAIProvider,
  setAIProvider,
  getAIProvider,
} from '../src/server/ai/GeminiAIProvider.js';
import {
  GroundedAnswerService,
  PARTIAL_COVERAGE_NOTICE,
  INSUFFICIENT_COVERAGE_NOTICE,
  SERVICE_ERROR_NOTICE,
} from '../src/server/answer/groundedAnswerService.js';
import {
  CandidateChunk,
  EvidenceVerificationResult,
  SufficiencyEvaluation,
  QuestionUnderstandingResult,
} from '../src/shared/types/index.js';

const app = createApp();

describe('STEP 7 Focused Validation: Grounded Answer Generation', () => {
  const originalProvider = getAIProvider();

  afterEach(() => {
    setAIProvider(originalProvider);
  });

  describe('1. Sufficiency Branching & Grounded Synthesis', () => {
    it('generates complete grounded answer with citations when sufficiency is SUFFICIENT', async () => {
      const mockCandidate: CandidateChunk = {
        chunkId: 'chk_tawhid_1',
        sourceId: 'src_ic',
        sourceName: 'المحتوى الإسلامي',
        documentId: 'doc_ic_1854',
        title: 'معنى التوحيد',
        content: 'التوحيد في لسان الشرع هو إفراد الله تعالى بالعبادة والربوبية والأسماء والصفات.',
        category: 'العقيدة',
        contentHash: 'hash_tawhid_1',
        lexicalScore: 0.95,
        semanticScore: 0.92,
        combinedScore: 0.935,
      };

      const mockEvidence: EvidenceVerificationResult[] = [
        {
          evidenceId: 'ev_1',
          claimId: 'claim_1',
          sourceId: 'src_ic',
          chunkId: 'chk_tawhid_1',
          relation: 'يثبت النص معنى التوحيد الشرعي',
          verificationStatus: 'SUPPORTED',
          confidence: 0.95,
        },
      ];

      const mockSufficiency: SufficiencyEvaluation = {
        sufficiencyState: 'SUFFICIENT',
        claimCoverage: 1.0,
        supportedClaimsCount: 1,
        totalClaimsCount: 1,
        unsupportedClaims: [],
      };

      const mockProvider = {
        generateGroundedAnswer: async () => ({
          answer: 'التوحيد شرعاً هو إفراد الله تعالى بالعبادة والربوبية والأسماء والصفات وحده لا شريك له.',
          citedChunkIds: ['chk_tawhid_1'],
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
      };

      const service = new GroundedAnswerService(mockProvider as any);
      const result = await service.generateAnswer({
        question: 'ما معنى التوحيد؟',
        sufficiency: mockSufficiency,
        verifiedEvidence: mockEvidence,
        candidates: [mockCandidate],
        status: 'SUFFICIENT',
      });

      expect(result.status).toBe('ANSWERED');
      expect(result.answer).toContain('إفراد الله تعالى بالعبادة');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].chunkId).toBe('chk_tawhid_1');
      expect(result.citations[0].sourceName).toBe('المحتوى الإسلامي');
      expect(result.grounding?.isGrounded).toBe(true);
    });

    it('generates limited answer with partial notice when sufficiency is PARTIAL', async () => {
      const mockCandidate: CandidateChunk = {
        chunkId: 'chk_tafsir_ikhlas_0',
        sourceId: 'src_qp',
        sourceName: 'Quranpedia',
        documentId: 'doc_ikhlas',
        title: 'تفسير سورة الإخلاص',
        content: 'قل هو الله أحد: أي هو الواحد المنفرد بالألوهية، الله الصمد: المقصود في الحوائج.',
        category: 'التفسير',
        contentHash: 'hash_ikhlas',
        lexicalScore: 0.9,
        semanticScore: 0.85,
        combinedScore: 0.875,
      };

      const mockEvidence: EvidenceVerificationResult[] = [
        {
          evidenceId: 'ev_1',
          claimId: 'claim_1',
          sourceId: 'src_qp',
          chunkId: 'chk_tafsir_ikhlas_0',
          relation: 'يوضح بعض معاني ألفاظ السورة',
          verificationStatus: 'SUPPORTED',
          confidence: 0.9,
        },
      ];

      const mockSufficiency: SufficiencyEvaluation = {
        sufficiencyState: 'PARTIAL',
        claimCoverage: 0.5,
        supportedClaimsCount: 1,
        totalClaimsCount: 2,
        unsupportedClaims: ['سبب نزول السورة'],
      };

      const mockProvider = {
        generateGroundedAnswer: async () => ({
          answer: 'سورة الإخلاص تدل على وحدانية الله وصمديته.',
          citedChunkIds: ['chk_tafsir_ikhlas_0'],
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
      };

      const service = new GroundedAnswerService(mockProvider as any);
      const result = await service.generateAnswer({
        question: 'ما تفسير سورة الإخلاص؟',
        sufficiency: mockSufficiency,
        verifiedEvidence: mockEvidence,
        candidates: [mockCandidate],
        status: 'PARTIAL',
      });

      expect(result.status).toBe('PARTIAL');
      expect(result.answer).toContain(PARTIAL_COVERAGE_NOTICE);
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].chunkId).toBe('chk_tafsir_ikhlas_0');
    });

    it('abstains with exact Arabic notice and zero citations when sufficiency is INSUFFICIENT', async () => {
      const mockSufficiency: SufficiencyEvaluation = {
        sufficiencyState: 'INSUFFICIENT',
        claimCoverage: 0.0,
        supportedClaimsCount: 0,
        totalClaimsCount: 2,
        unsupportedClaims: ['دعوى أصولية لم توثق', 'تفصيل مسالك العلة'],
      };

      let generateCalled = false;
      const mockProvider = {
        generateGroundedAnswer: async () => {
          generateCalled = true;
          return { answer: 'إجابة تخمينية', citedChunkIds: [], inferredClaims: [] };
        },
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
      };

      const service = new GroundedAnswerService(mockProvider as any);
      const result = await service.generateAnswer({
        question: 'ما هو القياس في أصول الفقه ومسالك العلة؟',
        sufficiency: mockSufficiency,
        verifiedEvidence: [],
        candidates: [],
        status: 'INSUFFICIENT',
      });

      expect(generateCalled).toBe(false); // Model answer synthesis MUST NOT be called on INSUFFICIENT
      expect(result.status).toBe('INSUFFICIENT');
      expect(result.answer).toBe(INSUFFICIENT_COVERAGE_NOTICE);
      expect(result.citations).toHaveLength(0);
      expect(result.sources).toHaveLength(0);
    });
  });

  describe('2. Grounding Integrity & Citation Verification', () => {
    it('UNSUPPORTED_CLAIM_TEST: filters out UNSUPPORTED chunks and passes only SUPPORTED evidence to answer generator', async () => {
      const supportedCandidate: CandidateChunk = {
        chunkId: 'chk_supported',
        sourceId: 'src_ic',
        sourceName: 'المحتوى الإسلامي',
        documentId: 'doc_1',
        title: 'نص صحيح',
        content: 'نص معتمد وموثق يدعم القضية.',
        category: 'العقيدة',
        contentHash: 'hash_sup',
        lexicalScore: 0.9,
        semanticScore: 0.9,
        combinedScore: 0.9,
      };

      const unsupportedCandidate: CandidateChunk = {
        chunkId: 'chk_unsupported',
        sourceId: 'src_ic',
        sourceName: 'المحتوى الإسلامي',
        documentId: 'doc_2',
        title: 'نص غير ذي صلة',
        content: 'نص لا علاقة له بالقضية إطلاقاً.',
        category: 'الفقه',
        contentHash: 'hash_unsup',
        lexicalScore: 0.4,
        semanticScore: 0.3,
        combinedScore: 0.35,
      };

      const evidenceList: EvidenceVerificationResult[] = [
        {
          evidenceId: 'ev_sup',
          claimId: 'claim_1',
          sourceId: 'src_ic',
          chunkId: 'chk_supported',
          relation: 'يدعم القضية',
          verificationStatus: 'SUPPORTED',
          confidence: 0.95,
        },
        {
          evidenceId: 'ev_unsup',
          claimId: 'claim_2',
          sourceId: 'src_ic',
          chunkId: 'chk_unsupported',
          relation: 'لا علاقة له',
          verificationStatus: 'UNSUPPORTED',
          confidence: 0.1,
        },
      ];

      let receivedEvidence: EvidenceVerificationResult[] = [];
      let receivedChunks: any[] = [];

      const mockProvider = {
        generateGroundedAnswer: async (params: any) => {
          receivedEvidence = params.verifiedEvidence;
          receivedChunks = params.chunks;
          return {
            answer: 'إجابة مبنية على النص المعتمد فقط.',
            citedChunkIds: ['chk_supported'],
            inferredClaims: [],
          };
        },
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
      };

      const service = new GroundedAnswerService(mockProvider as any);
      await service.generateAnswer({
        question: 'سؤال اختباري؟',
        sufficiency: {
          sufficiencyState: 'PARTIAL',
          claimCoverage: 0.5,
          supportedClaimsCount: 1,
          totalClaimsCount: 2,
          unsupportedClaims: ['claim_2'],
        },
        verifiedEvidence: evidenceList,
        candidates: [supportedCandidate, unsupportedCandidate],
        status: 'PARTIAL',
      });

      // Assert that UNSUPPORTED evidence was never passed
      expect(receivedEvidence).toHaveLength(1);
      expect(receivedEvidence[0].chunkId).toBe('chk_supported');
      expect(receivedChunks).toHaveLength(1);
      expect(receivedChunks[0].chunkId).toBe('chk_supported');
    });

    it('FAKE_CITATION_TEST: rejects hallucinated or non-existent chunk citations from the AI response', async () => {
      const realCandidate: CandidateChunk = {
        chunkId: 'chk_real_1',
        sourceId: 'src_ic',
        sourceName: 'المحتوى الإسلامي',
        documentId: 'doc_real',
        title: 'مصدر حقيقي',
        content: 'نص موثق حقيقي في المستودع.',
        category: 'العقيدة',
        contentHash: 'hash_real',
        lexicalScore: 0.9,
        semanticScore: 0.9,
        combinedScore: 0.9,
      };

      const mockEvidence: EvidenceVerificationResult[] = [
        {
          evidenceId: 'ev_real',
          claimId: 'claim_1',
          sourceId: 'src_ic',
          chunkId: 'chk_real_1',
          relation: 'يدعم القضية',
          verificationStatus: 'SUPPORTED',
          confidence: 0.9,
        },
      ];

      const mockProvider = {
        generateGroundedAnswer: async () => ({
          answer: 'إجابة تدعي الاستناد إلى مصدر وهمي.',
          // Model returns a fake hallucinated chunkId along with the real one
          citedChunkIds: ['chk_real_1', 'chk_hallucinated_fake_chunk_999'],
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
      };

      const service = new GroundedAnswerService(mockProvider as any);
      const result = await service.generateAnswer({
        question: 'سؤال فحص المراجع الوهمية؟',
        sufficiency: {
          sufficiencyState: 'SUFFICIENT',
          claimCoverage: 1.0,
          supportedClaimsCount: 1,
          totalClaimsCount: 1,
          unsupportedClaims: [],
        },
        verifiedEvidence: mockEvidence,
        candidates: [realCandidate],
        status: 'SUFFICIENT',
      });

      // Citations MUST NOT contain the fake chunk
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].chunkId).toBe('chk_real_1');
      expect(result.citations.some((c) => c.chunkId === 'chk_hallucinated_fake_chunk_999')).toBe(false);
    });

    it('downgrades to PARTIAL with partial notice when validateGrounding flags ungrounded claims', async () => {
      const mockCandidate: CandidateChunk = {
        chunkId: 'chk_1',
        sourceId: 'src_ic',
        sourceName: 'المحتوى الإسلامي',
        documentId: 'doc_1',
        title: 'عنوان',
        content: 'نص بسيط.',
        category: 'العقيدة',
        contentHash: 'h1',
        lexicalScore: 0.8,
        semanticScore: 0.8,
        combinedScore: 0.8,
      };

      const mockEvidence: EvidenceVerificationResult[] = [
        {
          evidenceId: 'e1',
          claimId: 'c1',
          sourceId: 'src_ic',
          chunkId: 'chk_1',
          relation: 'يدعم',
          verificationStatus: 'SUPPORTED',
          confidence: 0.9,
        },
      ];

      const mockProvider = {
        generateGroundedAnswer: async () => ({
          answer: 'إجابة أضافت تفاصيل لم ترد في النص المصدري.',
          citedChunkIds: ['chk_1'],
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: false,
          unsupportedClaims: ['تفاصيل زائدة غير مستندة للأصل'],
          remedyAction: 'DOWNGRADE' as const,
        }),
      };

      const service = new GroundedAnswerService(mockProvider as any);
      const result = await service.generateAnswer({
        question: 'سؤال فحص التدقيق؟',
        sufficiency: {
          sufficiencyState: 'SUFFICIENT',
          claimCoverage: 1.0,
          supportedClaimsCount: 1,
          totalClaimsCount: 1,
          unsupportedClaims: [],
        },
        verifiedEvidence: mockEvidence,
        candidates: [mockCandidate],
        status: 'SUFFICIENT',
      });

      expect(result.status).toBe('PARTIAL');
      expect(result.answer).toContain(PARTIAL_COVERAGE_NOTICE);
      expect(result.grounding?.isGrounded).toBe(false);
      expect(result.grounding?.remedyAction).toBe('DOWNGRADE');
    });
  });

  describe('3. Special Route Gates & Service Error Handling in POST /api/ask', () => {
    it('PERSONAL_FATWA_GATE: never answers, returns empty citations, preserves specialist referral gate', async () => {
      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'أنا موسوس في الطهارة ومش عارف هل صلاتي صحيحة؟',
        normalizedQuestion: 'حكم الشك في صحة الصلاة والطهارة لمرض الوسواس',
        category: 'الفقه',
        task: 'استفتاء شخصي في الوسوسة',
        topic: 'أحكام الصلاة والطهارة',
        userGoal: 'طلب فتوى لحالة شخصية خاصة',
        claims: ['مسألة وسوسة شخصية تستوجب فتوى خاصة'],
        requestedEvidence: [],
        needsClarification: false,
        isPersonalFatwa: true,
      };

      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockUnderstanding) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      setAIProvider(provider);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_fatwa_step7',
          question: 'أنا موسوس في الطهارة ومش عارف هل صلاتي صحيحة؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PERSONAL_FATWA');
      expect(res.body.data.answer).toBeUndefined();
      expect(res.body.data.citations).toEqual([]);
      expect(res.body.data.sources).toEqual([]);
    });

    it('CLARIFICATION_GATE: never answers when needsClarification is true', async () => {
      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'ما رأيك في هذا؟',
        normalizedQuestion: 'ما حكم هذا الأمر المبهم؟',
        category: 'عام',
        task: 'طلب توضيح',
        topic: 'مبهم',
        userGoal: 'استفسار عن أمر غير محدد',
        claims: [],
        requestedEvidence: [],
        needsClarification: true,
        clarificationReason: 'السؤال مبهم للغاية ولا يحتوي على تفاصيل المسألة المراد الاستفسار عنها',
        isPersonalFatwa: false,
      };

      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockUnderstanding) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      setAIProvider(provider);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_clarify_step7',
          question: 'ما رأيك في هذا؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('NEEDS_CLARIFICATION');
      expect(res.body.data.answer).toBeUndefined();
      expect(res.body.data.clarificationPrompt).toContain('السؤال مبهم');
      expect(res.body.data.citations).toEqual([]);
    });

    it('handles AI provider synthesis error safely returning SERVICE_ERROR without crashing', async () => {
      const mockProvider = {
        generateGroundedAnswer: async () => {
          throw new Error('Gemini API 503 Service Unavailable');
        },
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
      };

      const service = new GroundedAnswerService(mockProvider as any);
      const result = await service.generateAnswer({
        question: 'سؤال تجربة العطل؟',
        sufficiency: {
          sufficiencyState: 'SUFFICIENT',
          claimCoverage: 1.0,
          supportedClaimsCount: 1,
          totalClaimsCount: 1,
          unsupportedClaims: [],
        },
        verifiedEvidence: [
          {
            evidenceId: 'e1',
            claimId: 'c1',
            sourceId: 's1',
            chunkId: 'chk_1',
            relation: 'دليل',
            verificationStatus: 'SUPPORTED',
            confidence: 0.9,
          },
        ],
        candidates: [],
        status: 'SUFFICIENT',
      });

      expect(result.status).toBe('SERVICE_ERROR');
      expect(result.answer).toBe(SERVICE_ERROR_NOTICE);
      expect(result.citations).toEqual([]);
      expect(result.sources).toEqual([]);
    });
  });
});
