import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import {
  GeminiAIProvider,
  setAIProvider,
  getAIProvider,
} from '../src/server/ai/GeminiAIProvider.js';
import { EvidenceVerificationService } from '../src/server/verification/evidenceVerificationService.js';
import { CandidateChunk, QuestionUnderstandingResult } from '../src/shared/types/index.js';
import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';

const app = createApp();

describe('STEP 6B Focused Validation: Claim ↔ Evidence Alignment', () => {
  const originalProvider = getAIProvider();

  afterEach(() => {
    setAIProvider(originalProvider);
  });

  describe('1. Claim Quality & Decomposition', () => {
    it('decomposes skeptical questions into objective verifiable claims without affirming misconceptions', async () => {
      const mockResult: QuestionUnderstandingResult = {
        originalQuestion: 'هل القرآن من تأليف محمد ﷺ؟',
        normalizedQuestion: 'هل القرآن الكريم وحي منزل من الله تعالى أم من تأليف بشري؟',
        category: 'القرآن ومصدره',
        task: 'بيان مصدر القرآن والرد على شبهة التأليف البشري',
        topic: 'مصدر القرآن الكريم',
        userGoal: 'معرفة حقيقة مصدر القرآن الكريم',
        claims: [
          'القرآن الكريم كلام الله ووحيه المنزل على نبيه محمد صلى الله عليه وسلم وليس من تأليف البشر',
          'عجز العرب والبشر عن الإتيان بمثل القرآن دليل على مصدره الإلهي',
        ],
        requestedEvidence: ['آيات التحدي وإعجاز القرآن', 'أقوال المفسرين'],
        needsClarification: false,
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
        apiKey: 'test-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const res = await provider.understandQuestion({ question: 'هل القرآن من تأليف محمد ﷺ؟' });
      expect(res.claims).toHaveLength(2);
      // Ensures the claim does NOT affirmatively assume the misconception as a positive assertion
      expect(res.claims[0]).not.toBe('القرآن من تأليف محمد');
      expect(res.claims[0]).toContain('كلام الله');
    });
  });

  describe('2. Retrieval Miss Fix: Contextualized Query Formulation', () => {
    it('preserves question context in claim query to prevent entity loss in short claims', async () => {
      const retriever = new HybridRetriever();
      // Test retrieval with question and claims
      const result = await retriever.retrieve({
        question: 'ما معنى التوحيد؟',
        normalizedQuestion: 'ما هو تعريف التوحيد لغة واصطلاحا؟',
        claims: ['التوحيد له معنى لغوي واصطلاحي'],
      }, { topK: 3 });

      expect(result.claimResults).toHaveLength(1);
      const topCandidates = result.claimResults[0].candidates;
      expect(topCandidates.length).toBeGreaterThan(0);
      // Top candidates should include authentic Tawhid terms or tafsir
      const hasTawhid = topCandidates.some(
        (c) => c.title.includes('التوحيد') || c.content.includes('التوحيد')
      );
      expect(hasTawhid).toBe(true);
    });
  });

  describe('3. Strict Grounding Rejection: FALSE_SUPPORT_TEST', () => {
    it('FALSE_SUPPORT_TEST: high lexical overlap with wrong/conflicting meaning MUST NOT become SUPPORTED', async () => {
      const mockVerifier = {
        verifyEvidence: async () => ({
          chunkId: 'chk_kaaba_qibla',
          claimId: 'claim_1',
          verificationStatus: 'UNSUPPORTED' as const,
          confidence: 0.05,
          relation: 'النص يثبت أن الكعبة قبلة للصلاة فقط وأن العبادة لله وحده لا شريك له، وينفي عبادة الكعبة بذاتها',
        }),
      };

      const verifierService = new EvidenceVerificationService(mockVerifier as any);

      const candidate: CandidateChunk = {
        chunkId: 'chk_kaaba_qibla',
        sourceId: 'src_qp',
        sourceName: 'Quranpedia',
        documentId: 'doc_1',
        title: 'القبلة والكعبة',
        content: 'الكعبة المشرفة جعلها الله قياماً للناس وقبلة يتوجه إليها المسلمون في صلاتهم، ولا يعبد المسلم الكعبة بل يعبد رب البيت وحده لا شريك له.',
        category: 'العقيدة',
        contentHash: 'hash_qibla',
        lexicalScore: 0.96,
        semanticScore: 0.91,
        combinedScore: 0.93,
      };

      const result = await verifierService.verifySingleClaimEvidence(
        'المسلمون يعبدون الكعبة المشرفة كإله معبود',
        candidate,
        'claim_1'
      );

      expect(result.verificationStatus).toBe('UNSUPPORTED');
      expect(result.verificationStatus).not.toBe('SUPPORTED');
    });
  });

  describe('4. Coverage Gap Ingestion Verification', () => {
    it('evaluates newly ingested Quranpedia Tafsir al-Muyassar chunk as SUPPORTED for Surah Al-Ikhlas', async () => {
      const mockVerifier = {
        verifyEvidence: async () => ({
          chunkId: 'chk_qp_tafsir_ikhlas_0',
          claimId: 'claim_ikhlas_1',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.95,
          relation: 'النص المصدري يفسر صراحة أن الله الصمد هو الذي يقصده الخلائق في قضاء الحوائج والرغائب',
        }),
      };

      const verifierService = new EvidenceVerificationService(mockVerifier as any);

      const candidate: CandidateChunk = {
        chunkId: 'chk_qp_tafsir_ikhlas_0',
        sourceId: 'src_quranpedia',
        sourceName: 'الموسوعة القرآنية (Quranpedia) — التفسير الميسر',
        documentId: 'doc_qp_tafsir_ikhlas_muyassar',
        title: 'تفسير سورة الإخلاص — التفسير الميسر',
        content: 'الله الصمد: الله الذي كَمُل في صفات الشَّرَف والمجد والعظمة، الذي يقصده الخلائق في قضاء الحوائج والرغائب.',
        category: 'التفسير وعلوم القرآن',
        contentHash: 'hash_ikhlas_muyassar',
        lexicalScore: 0.92,
        semanticScore: 0.89,
        combinedScore: 0.902,
      };

      const result = await verifierService.verifySingleClaimEvidence(
        'معنى الصمد هو السيد الذي يقصده الخلائق في قضاء الحوائج والرغائب',
        candidate,
        'claim_ikhlas_1'
      );

      expect(result.verificationStatus).toBe('SUPPORTED');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('5. Sufficiency State Calculation', () => {
    it('calculates PARTIAL when some claims are supported but others remain unsupported', () => {
      const claims = ['دعوى 1', 'دعوى 2'];
      const verified = [
        {
          evidenceId: 'e1',
          claimId: 'claim_0',
          sourceId: 's1',
          chunkId: 'c1',
          relation: 'مدعوم',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.95,
        },
        {
          evidenceId: 'e2',
          claimId: 'claim_1',
          sourceId: 's1',
          chunkId: 'c2',
          relation: 'غير مدعوم',
          verificationStatus: 'UNSUPPORTED' as const,
          confidence: 0.1,
        },
      ];

      const sufficiency = EvidenceVerificationService.calculateSufficiency(claims, verified);
      expect(sufficiency.sufficiencyState).toBe('PARTIAL');
      expect(sufficiency.supportedClaimsCount).toBe(1);
    });

    it('calculates INSUFFICIENT when no claims are supported without converting weak evidence', () => {
      const claims = ['دعوى 1', 'دعوى 2'];
      const verified = [
        {
          evidenceId: 'e1',
          claimId: 'claim_0',
          sourceId: 's1',
          chunkId: 'c1',
          relation: 'غير مدعوم',
          verificationStatus: 'UNSUPPORTED' as const,
          confidence: 0.1,
        },
      ];

      const sufficiency = EvidenceVerificationService.calculateSufficiency(claims, verified);
      expect(sufficiency.sufficiencyState).toBe('INSUFFICIENT');
      expect(sufficiency.supportedClaimsCount).toBe(0);
    });
  });
});
