import { describe, it, expect, afterEach } from 'vitest';
import { computeVerifiedClaims } from '../src/client/pages/AnswerPage.js';
import { AskResponse } from '../src/shared/types/index.js';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { INSUFFICIENT_COVERAGE_NOTICE } from '../src/server/answer/groundedAnswerService.js';
import { getAIProvider, setAIProvider } from '../src/server/ai/GeminiAIProvider.js';

describe('Safe Patch 1: Verified Claim Display Logic', () => {
  const app = createApp();

  describe('1. SUPPORTED claims display', () => {
    it('should show a claim as SUPPORTED when existing verification confirms support', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_supported_01',
        status: 'ANSWERED',
        question: 'ما هي أركان الإسلام؟',
        answer: 'أركان الإسلام خمسة: شهادة أن لا إله إلا الله وأن محمداً رسول الله، وإقام الصلاة...',
        claims: ['شهادة أن لا إله إلا الله وأن محمداً رسول الله وإقام الصلاة'],
        evidence: [
          {
            evidenceId: 'ev_1',
            claimId: 'claim_1',
            sourceId: 'src_bukhari',
            chunkId: 'chunk_1',
            relation: 'تطابق صريح',
            verificationStatus: 'SUPPORTED',
            confidence: 0.95,
          },
        ],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('شهادة أن لا إله إلا الله وأن محمداً رسول الله وإقام الصلاة');
      expect(result[0].status).toBe('SUPPORTED');
    });

    it('should match claim by claim text when claimId matches claim string', () => {
      const claimText = 'الإسلام دين يدعو إلى العلم';
      const mockResponse: AskResponse = {
        interactionId: 'int_supported_02',
        status: 'ANSWERED',
        question: 'هل يدعو الإسلام إلى العلم؟',
        answer: 'نعم، دلت النصوص الشرعية على فضل العلم والحث عليه.',
        claims: [claimText],
        evidence: [
          {
            evidenceId: 'ev_2',
            claimId: claimText,
            sourceId: 'src_quranpedia',
            chunkId: 'chunk_2',
            relation: 'تطابق صريح',
            verificationStatus: 'SUPPORTED',
            confidence: 0.9,
          },
        ],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(claimText);
      expect(result[0].status).toBe('SUPPORTED');
    });
  });

  describe('2. UNSUPPORTED claims hidden', () => {
    it('should never show an UNSUPPORTED claim as verified', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_unsupported_01',
        status: 'ANSWERED',
        question: 'مسألة تجريبية',
        claims: ['دعوى غير موثقة ولا تستند لدليل'],
        evidence: [
          {
            evidenceId: 'ev_3',
            claimId: 'claim_1',
            sourceId: 'src_1',
            chunkId: 'chunk_3',
            relation: 'لا يوجد دليل',
            verificationStatus: 'UNSUPPORTED',
            confidence: 0.2,
          },
        ],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(0);
    });

    it('should hide UNSUPPORTED claims while showing SUPPORTED claims in a mixed question', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_mixed_01',
        status: 'ANSWERED',
        question: 'مسألة مركبة',
        claims: ['دعوى مثبتة وصحيحة', 'دعوى شائعة غير صحيحة'],
        evidence: [
          {
            evidenceId: 'ev_4',
            claimId: 'claim_1',
            sourceId: 'src_1',
            chunkId: 'chunk_1',
            relation: 'تطابق',
            verificationStatus: 'SUPPORTED',
            confidence: 0.9,
          },
          {
            evidenceId: 'ev_5',
            claimId: 'claim_2',
            sourceId: 'src_2',
            chunkId: 'chunk_2',
            relation: 'نفي أو انعدام الدليل',
            verificationStatus: 'UNSUPPORTED',
            confidence: 0.1,
          },
        ],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('دعوى مثبتة وصحيحة');
      expect(result[0].status).toBe('SUPPORTED');
      expect(result.some((c) => c.text === 'دعوى شائعة غير صحيحة')).toBe(false);
    });
  });

  describe('3. PARTIAL claims display', () => {
    it('should show PARTIAL claim labeled "مدعوم جزئياً"', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_partial_01',
        status: 'PARTIAL',
        question: 'مسألة جزئية الدلالة',
        claims: ['دعوى تدعمها الأدلة في بعض جوانبها فقط'],
        evidence: [
          {
            evidenceId: 'ev_6',
            claimId: 'claim_1',
            sourceId: 'src_1',
            chunkId: 'chunk_1',
            relation: 'دلالة عامة جزئية',
            verificationStatus: 'PARTIAL',
            confidence: 0.6,
          },
        ],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('دعوى تدعمها الأدلة في بعض جوانبها فقط');
      expect(result[0].status).toBe('PARTIAL');
    });
  });

  describe('4. INSUFFICIENT evidence regression: "حديث ابي هريره عن العلم"', () => {
    it('should completely hide verified claims when status is INSUFFICIENT with no supported claims', () => {
      const mockAbuHurayraInsufficient: AskResponse = {
        interactionId: 'int_abuhurayra_insufficient',
        status: 'INSUFFICIENT',
        question: 'حديث ابي هريره عن العلم',
        answer: INSUFFICIENT_COVERAGE_NOTICE,
        claims: ['حديث منسوب لأبي هريرة في فضل العلم'],
        evidence: [
          {
            evidenceId: 'ev_7',
            claimId: 'claim_1',
            sourceId: 'src_unknown',
            chunkId: 'chunk_none',
            relation: 'عدم وجود نص مطابق في المستودع المعتمد',
            verificationStatus: 'UNSUPPORTED',
            confidence: 0.1,
          },
        ],
        sufficiency: {
          sufficiencyState: 'INSUFFICIENT',
          claimCoverage: 0,
          supportedClaimsCount: 0,
          totalClaimsCount: 1,
          unsupportedClaims: ['حديث منسوب لأبي هريرة في فضل العلم'],
        },
      };

      const result = computeVerifiedClaims(mockAbuHurayraInsufficient);
      // Abstention remains unchanged
      expect(mockAbuHurayraInsufficient.answer).toBe(INSUFFICIENT_COVERAGE_NOTICE);
      expect(mockAbuHurayraInsufficient.status).toBe('INSUFFICIENT');
      // No extracted unsupported claim appears under verified claims
      expect(result).toHaveLength(0);
    });

    it('should completely hide verified claims when evidence list is empty (extracted claims are NOT verified)', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_no_evidence',
        status: 'INSUFFICIENT',
        question: 'حديث ابي هريره عن العلم',
        answer: INSUFFICIENT_COVERAGE_NOTICE,
        claims: ['حديث أبي هريرة'],
        evidence: [],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(0);
    });
  });

  describe('5. Safety and special statuses: PERSONAL_FATWA, NEEDS_CLARIFICATION, SERVICE_ERROR', () => {
    it('should not show verified claims for PERSONAL_FATWA', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_fatwa',
        status: 'PERSONAL_FATWA',
        question: 'هل يجوز لي شخصياً الجمع بين الصلاتين اليوم لظرف خاص؟',
        claims: ['جواز الجمع بين الصلاتين لظرف خاص'],
        evidence: [
          {
            evidenceId: 'ev_8',
            claimId: 'claim_1',
            sourceId: 'src_1',
            chunkId: 'chunk_1',
            relation: 'عام',
            verificationStatus: 'SUPPORTED',
            confidence: 0.9,
          },
        ],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(0);
    });

    it('should not show verified claims for NEEDS_CLARIFICATION', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_clarif',
        status: 'NEEDS_CLARIFICATION',
        question: 'الصلاة',
        clarificationPrompt: 'يرجى توضيح المسألة المطلوبة في الصلاة',
        claims: ['الصلاة'],
        evidence: [],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(0);
    });

    it('should not show verified claims for SERVICE_ERROR', () => {
      const mockResponse: AskResponse = {
        interactionId: 'int_err',
        status: 'SERVICE_ERROR',
        question: 'سؤال تعذر تحليله',
        claims: ['دعوى'],
        evidence: [],
      };

      const result = computeVerifiedClaims(mockResponse);
      expect(result).toHaveLength(0);
    });
  });

  describe('6. Existing Pipeline Regression', () => {
    const originalProvider = getAIProvider();

    afterEach(() => {
      setAIProvider(originalProvider);
    });

    it('POST /api/ask continues to function identically without pipeline changes', async () => {
      const mockUnderstanding = {
        originalQuestion: 'ما هي شروط التوبة الصادقة؟',
        normalizedQuestion: 'شروط التوبة الصادقة المقبولة',
        category: 'التزكية' as const,
        task: 'بيان شروط التوبة',
        topic: 'التوبة والإنابة',
        userGoal: 'معرفة شروط التوبة',
        claims: ['الإقلاع عن الذنب والندم عليه والعزم على عدم العود'],
        requestedEvidence: [],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
        verifyEvidence: async () => ({
          evidenceId: 'ev_test_1',
          claimId: 'claim_1',
          sourceId: 'src_ic',
          chunkId: 'chk_1',
          relation: 'تطابق صريح',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.95,
        }),
        generateGroundedAnswer: async () => ({
          answer: 'شروط التوبة الصادقة هي الإقلاع عن الذنب والندم والعزم على عدم الرجوع.',
          citedChunkIds: ['chk_1'],
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
          sessionId: 'session_patch1_test',
          question: 'ما هي شروط التوبة الصادقة؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ANSWERED');
      expect(res.body.data.answer).toBeDefined();

      // UI computation on the actual API response
      const verified = computeVerifiedClaims(res.body.data);
      expect(verified).toHaveLength(1);
      expect(verified[0].status).toBe('SUPPORTED');
      expect(verified[0].text).toContain('الإقلاع عن الذنب');
    });
  });
});
