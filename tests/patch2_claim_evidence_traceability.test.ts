import { describe, it, expect, afterEach } from 'vitest';
import { computeVerifiedClaims } from '../src/client/pages/AnswerPage.js';
import { AskResponse, CandidateChunk, EvidenceVerificationResult, TrustedSource } from '../src/shared/types/index.js';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { getAIProvider, setAIProvider } from '../src/server/ai/GeminiAIProvider.js';
import { INSUFFICIENT_COVERAGE_NOTICE } from '../src/server/answer/groundedAnswerService.js';

describe('Safe Patch 2: Claim -> Evidence Traceability Only', () => {
  const app = createApp();

  const mockQuranpediaSource: TrustedSource = {
    sourceId: 'src_quranpedia',
    name: 'Quranpedia (موسوعة القرآن الكريم)',
    author: 'فريق عمل المنصة',
    category: 'التفسير وعلوم القرآن',
    description: 'موسوعة متخصصة في جمع علوم القرآن',
    officialUrl: 'https://quranpedia.net',
    isVerified: true,
  };

  const mockIslamicContentSource: TrustedSource = {
    sourceId: 'src_islamic_content',
    name: 'المحتوى الإسلامي',
    author: 'الجمهرة',
    category: 'الحديث والشروح',
    description: 'بوابة المحتوى الإسلامي',
    officialUrl: 'https://islamic-content.com',
    isVerified: true,
  };

  const mockCandidateWithSpecificUrl: CandidateChunk = {
    chunkId: 'chk_quranpedia_1',
    documentId: 'doc_quranpedia_surah_1',
    sourceId: 'src_quranpedia',
    sourceName: 'Quranpedia (موسوعة القرآن الكريم)',
    sourceUrl: 'https://quranpedia.net/surah/1',
    content: 'سورة الفاتحة هي السبع المثاني وأم الكتاب، لا تصح الصلاة إلا بقراءتها.',
    title: 'سورة الفاتحة — فضائلها وأحكامها',
    category: 'التفسير وعلوم القرآن',
    contentHash: 'hash_qp_1',
    lexicalScore: 0.95,
    semanticScore: 0.9,
    combinedScore: 0.925,
  };

  const mockCandidateWithOnlyHomepage: CandidateChunk = {
    chunkId: 'chk_ic_1',
    documentId: 'doc_ic_hadith_42',
    sourceId: 'src_islamic_content',
    sourceName: 'المحتوى الإسلامي',
    sourceUrl: 'https://islamic-content.com', // equals homepage
    content: 'طلب العلم فريضة على كل مسلم، والحث على الاستزادة من الفقه في الدين.',
    title: 'حديث فضل العلم وفقه الدين',
    category: 'الحديث الشريف',
    contentHash: 'hash_ic_1',
    lexicalScore: 0.88,
    semanticScore: 0.85,
    combinedScore: 0.865,
  };

  const mockCandidateWithNoUrl: CandidateChunk = {
    chunkId: 'chk_manuscript_1',
    documentId: 'doc_manuscript_09',
    sourceId: 'src_local_archive',
    sourceName: 'المستودع المحلي للمخطوطات',
    sourceUrl: undefined,
    content: 'توثيق شروط التوبة الثلاثة في نصوص المتقدمين.',
    title: 'مخطوطة كتاب التوبة',
    category: 'التزكية',
    contentHash: 'hash_ms_1',
    lexicalScore: 0.8,
    semanticScore: 0.75,
    combinedScore: 0.775,
  };

  describe('1. CLAIM_EVIDENCE_MAPPING & SUPPORTED_EVIDENCE', () => {
    it('maps SUPPORTED claim to verified evidence and preserves all provenance identifiers', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_test_support_map',
        status: 'ANSWERED',
        question: 'ما هي منزلة سورة الفاتحة في الصلاة؟',
        claims: ['سورة الفاتحة ركن أساسي لا تصح الصلاة إلا بها'],
        evidence: [
          {
            evidenceId: 'ev_qp_101',
            claimId: 'claim_1',
            sourceId: 'src_quranpedia',
            chunkId: 'chk_quranpedia_1',
            relation: 'تطابق صريح بين النص والدعوى',
            verificationStatus: 'SUPPORTED',
            confidence: 0.96,
          },
        ],
        candidates: [mockCandidateWithSpecificUrl],
        sources: [mockQuranpediaSource],
      };

      const result = computeVerifiedClaims(mockResponse);

      expect(result).toHaveLength(1);
      const claim = result[0];
      expect(claim.text).toBe('سورة الفاتحة ركن أساسي لا تصح الصلاة إلا بها');
      expect(claim.status).toBe('SUPPORTED');

      // Evidence traceability checks
      expect(claim.evidence).toHaveLength(1);
      const ev = claim.evidence[0];
      expect(ev.evidenceId).toBe('ev_qp_101');
      expect(ev.claimId).toBe('claim_1');
      expect(ev.chunkId).toBe('chk_quranpedia_1');
      expect(ev.sourceId).toBe('src_quranpedia');
      expect(ev.sourceName).toBe('Quranpedia (موسوعة القرآن الكريم)');
      expect(ev.documentId).toBe('doc_quranpedia_surah_1');
      expect(ev.title).toBe('سورة الفاتحة — فضائلها وأحكامها');
      expect(ev.excerpt).toContain('سورة الفاتحة هي السبع المثاني');
      expect(ev.verificationStatus).toBe('SUPPORTED');
    });

    it('evidence belongs to the correct source when multiple sources exist', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_multi_source',
        status: 'ANSWERED',
        question: 'مسألة الفاتحة وفضل العلم',
        claims: ['قراءة الفاتحة في الصلاة', 'طلب العلم فريضة'],
        evidence: [
          {
            evidenceId: 'ev_qp_1',
            claimId: 'claim_1',
            sourceId: 'src_quranpedia',
            chunkId: 'chk_quranpedia_1',
            relation: 'نص الفاتحة',
            verificationStatus: 'SUPPORTED',
            confidence: 0.95,
          },
          {
            evidenceId: 'ev_ic_2',
            claimId: 'claim_2',
            sourceId: 'src_islamic_content',
            chunkId: 'chk_ic_1',
            relation: 'نص فضل العلم',
            verificationStatus: 'SUPPORTED',
            confidence: 0.92,
          },
        ],
        candidates: [mockCandidateWithSpecificUrl, mockCandidateWithOnlyHomepage],
        sources: [mockQuranpediaSource, mockIslamicContentSource],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(2);

      expect(result[0].evidence[0].sourceId).toBe('src_quranpedia');
      expect(result[0].evidence[0].sourceName).toContain('Quranpedia');

      expect(result[1].evidence[0].sourceId).toBe('src_islamic_content');
      expect(result[1].evidence[0].sourceName).toContain('المحتوى الإسلامي');
    });
  });

  describe('2. URL TRUTHFULNESS: SPECIFIC_URL_TRUTHFUL & NO_FAKE_URL', () => {
    it('uses specific document URL truthfully when specific URL exists in provenance', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_specific_url',
        status: 'ANSWERED',
        question: 'سؤال الفاتحة',
        claims: ['سورة الفاتحة'],
        evidence: [
          {
            evidenceId: 'ev_1',
            claimId: 'claim_1',
            sourceId: 'src_quranpedia',
            chunkId: 'chk_quranpedia_1',
            relation: 'دعم',
            verificationStatus: 'SUPPORTED',
            confidence: 0.95,
          },
        ],
        candidates: [mockCandidateWithSpecificUrl],
        sources: [mockQuranpediaSource],
      };

      const result = computeVerifiedClaims(mockResponse);
      const ev = result[0].evidence[0];
      expect(ev.url).toBe('https://quranpedia.net/surah/1');
      expect(ev.isSpecificUrl).toBe(true);
    });

    it('shows source homepage truthfully when only homepage URL exists', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_homepage_url',
        status: 'ANSWERED',
        question: 'سؤال فضل العلم',
        claims: ['طلب العلم'],
        evidence: [
          {
            evidenceId: 'ev_2',
            claimId: 'claim_1',
            sourceId: 'src_islamic_content',
            chunkId: 'chk_ic_1',
            relation: 'دعم',
            verificationStatus: 'SUPPORTED',
            confidence: 0.9,
          },
        ],
        candidates: [mockCandidateWithOnlyHomepage],
        sources: [mockIslamicContentSource],
      };

      const result = computeVerifiedClaims(mockResponse);
      const ev = result[0].evidence[0];
      expect(ev.url).toBe('https://islamic-content.com');
      expect(ev.isSpecificUrl).toBe(false);
    });

    it('never invents or fabricates a URL when none exists in provenance', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_no_url',
        status: 'ANSWERED',
        question: 'سؤال المخطوطات',
        claims: ['شروط التوبة في المخطوطات'],
        evidence: [
          {
            evidenceId: 'ev_3',
            claimId: 'claim_1',
            sourceId: 'src_local_archive',
            chunkId: 'chk_manuscript_1',
            relation: 'دعم من الأرشيف',
            verificationStatus: 'SUPPORTED',
            confidence: 0.85,
          },
        ],
        candidates: [mockCandidateWithNoUrl],
        sources: [
          {
            sourceId: 'src_local_archive',
            name: 'المستودع المحلي للمخطوطات',
            author: 'أرشيف محلي',
            category: 'مخطوطات',
            description: 'أرشيف دون موقع إنترنت',
            officialUrl: undefined, // No URL
            isVerified: true,
          },
        ],
      };

      const result = computeVerifiedClaims(mockResponse);
      const ev = result[0].evidence[0];
      expect(ev.url).toBeUndefined();
      expect(ev.isSpecificUrl).toBe(false);
    });
  });

  describe('3. PARTIAL_EVIDENCE & No Implied Full Support', () => {
    it('shows only evidence actually supporting the supported portion of a PARTIAL claim', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_partial_trace',
        status: 'PARTIAL',
        question: 'مسألة فقهية دقيقة',
        claims: ['دعوى مركبة جزء منها مدعوم وجزء غير مدعوم'],
        evidence: [
          {
            evidenceId: 'ev_partial_1',
            claimId: 'claim_1',
            sourceId: 'src_quranpedia',
            chunkId: 'chk_quranpedia_1',
            relation: 'دلالة جزئية على أصل المسألة فقط دون تفاصيلها',
            verificationStatus: 'PARTIAL',
            confidence: 0.6,
          },
          {
            evidenceId: 'ev_unsupported_2',
            claimId: 'claim_1',
            sourceId: 'src_islamic_content',
            chunkId: 'chk_ic_1',
            relation: 'النص لا يثبت الشق الثاني من الدعوى',
            verificationStatus: 'UNSUPPORTED',
            confidence: 0.1,
          },
        ],
        candidates: [mockCandidateWithSpecificUrl, mockCandidateWithOnlyHomepage],
        sources: [mockQuranpediaSource, mockIslamicContentSource],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(1);
      const claim = result[0];
      expect(claim.status).toBe('PARTIAL');

      // Crucial: Only the PARTIAL evidence is mapped; the UNSUPPORTED candidate is omitted
      expect(claim.evidence).toHaveLength(1);
      expect(claim.evidence[0].evidenceId).toBe('ev_partial_1');
      expect(claim.evidence[0].verificationStatus).toBe('PARTIAL');
      expect(claim.evidence.some((e) => e.verificationStatus !== 'PARTIAL')).toBe(false);
    });
  });

  describe('4. UNSUPPORTED_STILL_HIDDEN & INSUFFICIENT_STILL_HIDDEN', () => {
    it('unsupported claims remain strictly hidden from verified claims', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_unsupported_claims',
        status: 'ANSWERED',
        question: 'مسألة فيها دعوى صحيحة وأخرى باطلة',
        claims: ['دعوى صحيحة', 'دعوى باطلة لا أصل لها'],
        evidence: [
          {
            evidenceId: 'ev_supp',
            claimId: 'claim_1',
            sourceId: 'src_quranpedia',
            chunkId: 'chk_quranpedia_1',
            relation: 'مطابقة',
            verificationStatus: 'SUPPORTED',
            confidence: 0.95,
          },
          {
            evidenceId: 'ev_unsup',
            claimId: 'claim_2',
            sourceId: 'src_islamic_content',
            chunkId: 'chk_ic_1',
            relation: 'نفي الدليل',
            verificationStatus: 'UNSUPPORTED',
            confidence: 0.05,
          },
        ],
        candidates: [mockCandidateWithSpecificUrl, mockCandidateWithOnlyHomepage],
        sources: [mockQuranpediaSource, mockIslamicContentSource],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('دعوى صحيحة');
      expect(result.some((c) => c.text === 'دعوى باطلة لا أصل لها')).toBe(false);
    });

    it('claims with no supporting verified evidence cannot be displayed (Rule 5)', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_unmapped_claim',
        status: 'ANSWERED',
        question: 'مسألة بدعوى يتيمة',
        claims: ['دعوى لم يقم عليها دليل'],
        evidence: [], // No evidence
        candidates: [],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(0);
    });

    it('INSUFFICIENT with no supported evidence remains completely hidden ("حديث ابي هريره عن العلم")', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_abuhurayra_case',
        status: 'INSUFFICIENT',
        question: 'حديث ابي هريره عن العلم',
        answer: INSUFFICIENT_COVERAGE_NOTICE,
        claims: ['حديث منسوب لأبي هريرة في العلم'],
        evidence: [
          {
            evidenceId: 'ev_failed',
            claimId: 'claim_1',
            sourceId: 'src_unknown',
            chunkId: 'chk_none',
            relation: 'غير متوفر في المستودع المعتمد',
            verificationStatus: 'UNSUPPORTED',
            confidence: 0.0,
          },
        ],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(0);
    });
  });

  describe('5. Pipeline and AI calls unchanged', () => {
    const originalProvider = getAIProvider();

    afterEach(() => {
      setAIProvider(originalProvider);
    });

    it('POST /api/ask pipeline executes identically with claim-level evidence traceability attached', async () => {
      const mockUnderstanding = {
        originalQuestion: 'ما هي شروط التوبة الصادقة؟',
        normalizedQuestion: 'شروط التوبة الصادقة',
        category: 'التزكية' as const,
        task: 'بيان شروط التوبة',
        topic: 'التوبة',
        userGoal: 'معرفة شروط التوبة',
        claims: ['الإقلاع عن الذنب والندم والعزم على عدم الرجوع'],
        requestedEvidence: [],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
        verifyEvidence: async () => ({
          evidenceId: 'ev_pipeline_1',
          claimId: 'claim_1',
          sourceId: 'src_islamic_content',
          chunkId: 'chk_ic_1',
          relation: 'تطابق صريح مع الشروط',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.94,
        }),
        generateGroundedAnswer: async () => ({
          answer: 'شروط التوبة الصادقة ثلاثة: الإقلاع والندم والعزم.',
          citedChunkIds: ['chk_ic_1'],
          inferredClaims: [],
        }),
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
          sessionId: 'session_patch2_pipeline',
          question: 'ما هي شروط التوبة الصادقة؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const verified = computeVerifiedClaims(res.body.data);
      expect(verified).toHaveLength(1);
      expect(verified[0].status).toBe('SUPPORTED');
      expect(verified[0].evidence).toBeDefined();
      expect(verified[0].evidence.length).toBeGreaterThanOrEqual(1);
      expect(verified[0].evidence[0].sourceId).toBeDefined();
    });
  });
});
