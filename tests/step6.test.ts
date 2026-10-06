import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import {
  GeminiAIProvider,
  setAIProvider,
  getAIProvider,
} from '../src/server/ai/GeminiAIProvider.js';
import { EvidenceVerificationService } from '../src/server/verification/evidenceVerificationService.js';
import {
  CandidateChunk,
  QuestionUnderstandingResult,
  EvidenceVerificationResult,
} from '../src/shared/types/index.js';

const app = createApp();

describe('STEP 6 Focused Verification: Evidence Verification & Sufficiency', () => {
  const originalProvider = getAIProvider();

  afterEach(() => {
    setAIProvider(originalProvider);
  });

  describe('1. Evidence Verification & Grounding', () => {
    it('verifies candidate chunk as SUPPORTED when content substantiates atomic claim', async () => {
      const mockVerifier = {
        verifyEvidence: async () => ({
          chunkId: 'chk_tawhid_1',
          claimId: 'claim_1',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.95,
          relation: 'النص يوضح صراحة معنى التوحيد وإفراد الله بالعبادة',
        }),
      };

      const verifierService = new EvidenceVerificationService(mockVerifier as any);

      const candidate: CandidateChunk = {
        chunkId: 'chk_tawhid_1',
        sourceId: 'src_ic',
        sourceName: 'المحتوى الإسلامي',
        documentId: 'doc_ic_1854',
        title: 'التوحيد',
        content: 'التوحيد في لسان الشرع هو إفراد الله تعالى بالعبادة والربوبية والأسماء والصفات.',
        category: 'العقيدة',
        contentHash: 'hash1',
        lexicalScore: 0.9,
        semanticScore: 0.9,
        combinedScore: 0.9,
      };

      const result = await verifierService.verifySingleClaimEvidence(
        'التوحيد هو إفراد الله بالعبادة والربوبية',
        candidate,
        'claim_1'
      );

      expect(result.verificationStatus).toBe('SUPPORTED');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.chunkId).toBe('chk_tawhid_1');
      expect(result.relation).toContain('التوحيد');
    });

    it('rejects candidate chunk as UNSUPPORTED when text is unrelated', async () => {
      const mockVerifier = {
        verifyEvidence: async () => ({
          chunkId: 'chk_unrelated',
          claimId: 'claim_1',
          verificationStatus: 'UNSUPPORTED' as const,
          confidence: 0.1,
          relation: 'النص يتحدث عن أحكام الصيام ولا صلة له ببيان أركان الإيمان',
        }),
      };

      const verifierService = new EvidenceVerificationService(mockVerifier as any);

      const candidate: CandidateChunk = {
        chunkId: 'chk_unrelated',
        sourceId: 'src_ic',
        sourceName: 'المحتوى الإسلامي',
        documentId: 'doc_unrelated',
        title: 'أحكام الصيام',
        content: 'الصيام هو الإمساك عن المفطرات من طلوع الفجر إلى غروب الشمس بنية التقرب إلى الله.',
        category: 'الفقه',
        contentHash: 'hash_unrelated',
        lexicalScore: 0.2,
        semanticScore: 0.2,
        combinedScore: 0.2,
      };

      const result = await verifierService.verifySingleClaimEvidence(
        'أركان الإيمان ستة هي الإيمان بالله وملائكته وكتبه ورسله واليوم الآخر والقدر',
        candidate,
        'claim_1'
      );

      expect(result.verificationStatus).toBe('UNSUPPORTED');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('FALSE_SUPPORT_TEST: high retrieval score with different/conflicting meaning MUST NOT become SUPPORTED', async () => {
      // Simulates lexical overlap (e.g. keywords like "يعبد" and "الكعبة") without supporting the false claim
      const mockVerifier = {
        verifyEvidence: async () => ({
          chunkId: 'chk_kaaba_qibla',
          claimId: 'claim_false_kaaba',
          verificationStatus: 'UNSUPPORTED' as const,
          confidence: 0.05,
          relation: 'النص يثبت أن الكعبة قبلة للصلاة فقط وأن العبادة لله وحده، وينفي عبادة الكعبة',
        }),
      };

      const verifierService = new EvidenceVerificationService(mockVerifier as any);

      const candidate: CandidateChunk = {
        chunkId: 'chk_kaaba_qibla',
        sourceId: 'src_qp',
        sourceName: 'Quranpedia',
        documentId: 'doc_quran_al_furqan',
        title: 'القبلة والكعبة',
        content: 'الكعبة المشرفة جعلها الله قياماً للناس وقبلة يتوجه إليها المسلمون في صلاتهم، ولا يعبد المسلم الكعبة بل يعبد رب البيت.',
        category: 'العقيدة',
        contentHash: 'hash_qibla',
        lexicalScore: 0.95, // High lexical score
        semanticScore: 0.92, // High semantic score
        combinedScore: 0.935,
      };

      const result = await verifierService.verifySingleClaimEvidence(
        'المسلمون يعبدون الكعبة المشرفة كإله',
        candidate,
        'claim_false_kaaba'
      );

      expect(result.verificationStatus).toBe('UNSUPPORTED');
      expect(result.verificationStatus).not.toBe('SUPPORTED');
    });

    it('handles malformed AI verifier output gracefully returning VERIFICATION_FAILED', async () => {
      // Mock fetch returning invalid JSON / unexpected shape
      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'This is not valid JSON at all: error 500' }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: 'test-api-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const res = await provider.verifyEvidence({
        claim: 'أي ادعاء تجريبي',
        chunkText: 'نص تجريبي',
        chunkTitle: 'عنوان',
        chunkId: 'chunk_fail',
      });

      expect(res.verificationStatus).toBe('VERIFICATION_FAILED');
      expect(res.confidence).toBe(0);
    });

    it('handles AI provider network error/timeout gracefully without crashing', async () => {
      const mockFetch = async () => {
        throw new Error('Network timeout after 6000ms');
      };

      const provider = new GeminiAIProvider({
        apiKey: 'test-api-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const res = await provider.verifyEvidence({
        claim: 'أي ادعاء تجريبي',
        chunkText: 'نص تجريبي',
        chunkTitle: 'عنوان',
        chunkId: 'chunk_fail_net',
      });

      expect(res.verificationStatus).toBe('VERIFICATION_FAILED');
      expect(res.confidence).toBe(0);
    });

    it('deduplicates identical claim/chunk pairs in the same verification request', async () => {
      let callCount = 0;
      const mockVerifier = {
        verifyEvidence: async () => {
          callCount++;
          return {
            chunkId: 'chk_dup',
            claimId: 'claim_1',
            verificationStatus: 'SUPPORTED' as const,
            confidence: 0.9,
            relation: 'تطابق',
          };
        },
      };

      const verifierService = new EvidenceVerificationService(mockVerifier as any);
      const candidate: CandidateChunk = {
        chunkId: 'chk_dup',
        sourceId: 'src_ic',
        sourceName: 'المحتوى الإسلامي',
        documentId: 'doc_1',
        title: 'عنوان',
        content: 'نص',
        category: 'العقيدة',
        contentHash: 'hash',
        lexicalScore: 0.8,
        semanticScore: 0.8,
        combinedScore: 0.8,
      };

      // Call twice with the same claim and chunk
      await verifierService.verifySingleClaimEvidence('ادعاء واحد', candidate, 'claim_1');
      await verifierService.verifySingleClaimEvidence('ادعاء واحد', candidate, 'claim_1');

      expect(callCount).toBe(1); // Second call served from request-level cache
    });
  });

  describe('2. Sufficiency Evaluation', () => {
    it('evaluates SUFFICIENT when all required atomic claims are supported', () => {
      const claims = ['ادعاء 1', 'ادعاء 2'];
      const verified = [
        {
          chunkId: 'c1',
          claimId: 'claim_0',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.9,
          relation: 'داعم',
        },
        {
          chunkId: 'c2',
          claimId: 'claim_1',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.9,
          relation: 'داعم',
        },
      ];

      const sufficiency = EvidenceVerificationService.calculateSufficiency(claims, verified);
      expect(sufficiency.sufficiencyState).toBe('SUFFICIENT');
      expect(sufficiency.claimCoverage).toBe(1.0);
      expect(sufficiency.supportedClaimsCount).toBe(2);
    });

    it('evaluates PARTIAL when some claims are supported but others are unsupported', () => {
      const claims = ['ادعاء 1', 'ادعاء 2', 'ادعاء 3'];
      const verified = [
        {
          chunkId: 'c1',
          claimId: 'claim_0',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.9,
          relation: 'داعم',
        },
        {
          chunkId: 'c2',
          claimId: 'claim_1',
          verificationStatus: 'UNSUPPORTED' as const,
          confidence: 0.1,
          relation: 'غير مدعوم',
        },
      ];

      const sufficiency = EvidenceVerificationService.calculateSufficiency(claims, verified);
      expect(sufficiency.sufficiencyState).toBe('PARTIAL');
      expect(sufficiency.claimCoverage).toBeCloseTo(0.33, 1);
      expect(sufficiency.supportedClaimsCount).toBe(1);
    });

    it('evaluates INSUFFICIENT when no claims are supported', () => {
      const claims = ['ادعاء 1', 'ادعاء 2'];
      const verified = [
        {
          chunkId: 'c1',
          claimId: 'claim_0',
          verificationStatus: 'UNSUPPORTED' as const,
          confidence: 0.1,
          relation: 'غير مدعوم',
        },
        {
          chunkId: 'c2',
          claimId: 'claim_1',
          verificationStatus: 'UNSUPPORTED' as const,
          confidence: 0.1,
          relation: 'غير مدعوم',
        },
      ];

      const sufficiency = EvidenceVerificationService.calculateSufficiency(claims, verified);
      expect(sufficiency.sufficiencyState).toBe('INSUFFICIENT');
      expect(sufficiency.claimCoverage).toBe(0);
      expect(sufficiency.supportedClaimsCount).toBe(0);
    });
  });

  describe('3. PERSONAL_FATWA & CLARIFICATION GATES in POST /api/ask', () => {
    it('PERSONAL_FATWA_GATE: bypasses normal answer verification when isPersonalFatwa=true', async () => {
      const mockResult: QuestionUnderstandingResult = {
        originalQuestion: 'أنا طلقت زوجتي في رسالة فهل يقع الطلاق؟',
        normalizedQuestion: 'حكم وقوع الطلاق عبر رسالة نصية في مسألة شخصية',
        category: 'الفقه',
        task: 'استفتاء شخصي',
        topic: 'أحكام الطلاق الشخصية',
        userGoal: 'طلب فتوى في مسألة أسرية خاصة',
        claims: ['مسألة طلاق شخصية تستلزم فتوى خاصة'],
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
                  parts: [{ text: JSON.stringify(mockResult) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: 'test-mock-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      setAIProvider(provider);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_fatwa_test',
          question: 'أنا طلقت زوجتي في رسالة فهل يقع الطلاق؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PERSONAL_FATWA');
      expect(res.body.data.understanding.isPersonalFatwa).toBe(true);
      expect(res.body.data.answer).toBeUndefined(); // MUST NOT generate fake answer
      expect(res.body.data.evidence).toEqual([]); // Verification bypassed
    });

    it('CLARIFICATION_GATE: preserves clarification path when needsClarification=true', async () => {
      const mockResult: QuestionUnderstandingResult = {
        originalQuestion: 'ما حكم ذلك؟',
        normalizedQuestion: 'ما حكم ذلك الأمر غير المحدد؟',
        category: 'الفقه',
        task: 'طلب توضيح',
        topic: 'مسألة غير محددة',
        userGoal: 'طلب حكم شرعي لسياق مبهم',
        claims: [],
        requestedEvidence: [],
        needsClarification: true,
        clarificationReason: 'السؤال مبهم ويحتاج لتحديد الفعل أو المسألة المسؤول عنها',
        isPersonalFatwa: false,
      };

      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockResult) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const provider = new GeminiAIProvider({
        apiKey: 'test-mock-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      setAIProvider(provider);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'sess_clarify_test',
          question: 'ما حكم ذلك؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('NEEDS_CLARIFICATION');
      expect(res.body.data.understanding.needsClarification).toBe(true);
      expect(res.body.data.understanding.clarificationReason).toBeTruthy();
      expect(res.body.data.answer).toBeUndefined(); // MUST NOT guess or answer
    });
  });
});
