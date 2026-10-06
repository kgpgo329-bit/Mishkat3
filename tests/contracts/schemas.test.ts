import { describe, it, expect } from 'vitest';
import {
  AskRequestSchema,
  QuestionUnderstandingResultSchema,
  EvidenceVerificationResultSchema,
  SufficiencyEvaluationSchema,
  AssessmentSubmissionSchema,
  TrustedSourceSchema,
} from '../../src/shared/schemas/index.js';

describe('Shared Schemas Contract Verification', () => {
  describe('AskRequestSchema', () => {
    it('should validate valid direct user question request', () => {
      const valid = {
        sessionId: 'session_123',
        question: 'ما هي أركان الإيمان الستة؟',
        category: 'العقيدة',
        origin: 'USER',
      };
      const parsed = AskRequestSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should validate valid Deep Learning follow-up request with parentInteractionId', () => {
      const valid = {
        sessionId: 'session_123',
        question: 'ما الأدلة على الإيمان بالقدر خيره وشره؟',
        origin: 'DEEP_LEARNING',
        parentInteractionId: 'int_456',
      };
      const parsed = AskRequestSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject empty question', () => {
      const invalid = {
        sessionId: 'session_123',
        question: ' ',
        origin: 'USER',
      };
      const parsed = AskRequestSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('should reject invalid origin', () => {
      const invalid = {
        sessionId: 'session_123',
        question: 'سؤال تجريبي',
        origin: 'UNKNOWN_ORIGIN',
      };
      const parsed = AskRequestSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('QuestionUnderstandingResultSchema', () => {
    it('should validate structured understanding output', () => {
      const data = {
        originalQuestion: 'حكم صلاة الكسوف في الإسلام؟',
        normalizedQuestion: 'ما حكم صلاة الكسوف في الشريعة الإسلامية؟',
        category: 'الفقه',
        task: 'حكم شرعي',
        topic: 'صلاة الكسوف',
        userGoal: 'معرفة صفة وحكم صلاة الكسوف',
        claims: ['صلاة الكسوف سنة مؤكدة عند جمهور الفقهاء'],
        requestedEvidence: ['أحاديث الكسوف في الصحيحين'],
        needsClarification: false,
        isPersonalFatwa: false,
      };
      const parsed = QuestionUnderstandingResultSchema.safeParse(data);
      expect(parsed.success).toBe(true);
    });

    it('should validate personal fatwa flag with clarification', () => {
      const data = {
        originalQuestion: 'طلقت زوجتي طلقتين وأنا غضبان فما موقفي؟',
        normalizedQuestion: 'مسألة طلاق شخصية في حالة غضب',
        category: 'الفقه',
        task: 'فتوى شخصية',
        topic: 'أحكام الطلاق الشخصية',
        userGoal: 'طلب فتوى فردية',
        claims: [],
        requestedEvidence: [],
        needsClarification: true,
        clarificationReason: 'مسألة أحوال شخصية تستلزم تحقيق المفتي في صفة الغضب ووقائعه',
        isPersonalFatwa: true,
      };
      const parsed = QuestionUnderstandingResultSchema.safeParse(data);
      expect(parsed.success).toBe(true);
    });
  });

  describe('EvidenceVerificationResultSchema', () => {
    it('should allow only valid verification statuses', () => {
      const validStatuses = ['SUPPORTED', 'PARTIAL', 'UNSUPPORTED', 'VERIFICATION_FAILED'] as const;
      for (const status of validStatuses) {
        const item = {
          evidenceId: 'ev_1',
          claimId: 'cl_1',
          sourceId: 'src_bukhari',
          chunkId: 'chk_100',
          relation: 'direct_support',
          verificationStatus: status,
          confidence: 0.95,
        };
        const parsed = EvidenceVerificationResultSchema.safeParse(item);
        expect(parsed.success).toBe(true);
      }
    });

    it('should reject invalid verification status', () => {
      const invalid = {
        evidenceId: 'ev_1',
        claimId: 'cl_1',
        sourceId: 'src_bukhari',
        chunkId: 'chk_100',
        relation: 'direct_support',
        verificationStatus: 'UNKNOWN_STATUS',
        confidence: 0.95,
      };
      const parsed = EvidenceVerificationResultSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('SufficiencyEvaluationSchema', () => {
    it('should validate sufficiency states', () => {
      const valid = {
        sufficiencyState: 'SUFFICIENT',
        claimCoverage: 1.0,
        supportedClaimsCount: 3,
        totalClaimsCount: 3,
        unsupportedClaims: [],
      };
      const parsed = SufficiencyEvaluationSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });
  });

  describe('AssessmentSubmissionSchema', () => {
    it('should validate answer mappings', () => {
      const valid = {
        answers: {
          q1: 0,
          q2: 2,
          q3: 1,
        },
      };
      const parsed = AssessmentSubmissionSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });
  });

  describe('TrustedSourceSchema', () => {
    it('should validate verified source format', () => {
      const valid = {
        sourceId: 'src_bukhari',
        name: 'صحيح البخاري',
        author: 'الإمام محمد بن إسماعيل البخاري',
        era: 'القرن الثالث الهجري',
        category: 'الحديث',
        description: 'أصح كتاب بعد كتاب الله عز وجل',
        officialUrl: 'https://waqfeya.net/book.php?bid=603',
        isVerified: true,
      };
      const parsed = TrustedSourceSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });
  });
});
