import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import {
  GeminiAIProvider,
  setAIProvider,
  getAIProvider,
  validateFollowUpQuestion,
} from '../src/server/ai/GeminiAIProvider.js';
import { FollowUpQuestion, QuestionUnderstandingResult } from '../src/shared/types/index.js';
import { INSUFFICIENT_COVERAGE_NOTICE } from '../src/server/answer/groundedAnswerService.js';

describe('Safe Patch 3: Evidence-Constrained Deep Learning Only', () => {
  const app = createApp();
  const originalProvider = getAIProvider();

  afterEach(() => {
    setAIProvider(originalProvider);
  });

  describe('1. VERIFIED_CONTEXT_ONLY & Input Sanitization', () => {
    it('provides only verified context to generateFollowUps without passing unsupported claims', async () => {
      let receivedParams: any = null;

      const mockProvider = {
        understandQuestion: async () => ({
          originalQuestion: 'ما هي شروط التوبة؟',
          normalizedQuestion: 'شروط التوبة الصادقة',
          category: 'التزكية' as const,
          task: 'شروط التوبة',
          topic: 'التوبة',
          userGoal: 'معرفة الشروط',
          claims: ['الإقلاع عن الذنب والندم', 'دعوى مستخلصة غير مثبتة لا دليل عليها'],
          requestedEvidence: [],
          needsClarification: false,
          isPersonalFatwa: false,
        }),
        verifyEvidence: async (p: any) => {
          if (p.claim.includes('الإقلاع')) {
            return {
              evidenceId: 'ev_1',
              claimId: p.claimId,
              sourceId: 'src_ic',
              chunkId: p.candidateChunk?.chunkId || 'chk_1',
              relation: 'مطابقة صريحة',
              verificationStatus: 'SUPPORTED' as const,
              confidence: 0.95,
            };
          }
          return {
            evidenceId: 'ev_2',
            claimId: p.claimId,
            sourceId: 'src_ic',
            chunkId: p.candidateChunk?.chunkId || 'chk_2',
            relation: 'لا دليل',
            verificationStatus: 'UNSUPPORTED' as const,
            confidence: 0.1,
          };
        },
        generateGroundedAnswer: async () => ({
          answer: 'شروط التوبة هي الإقلاع عن الذنب والندم والعزم.',
          citedChunkIds: ['chk_1'],
          inferredClaims: [],
        }),
        validateGrounding: async () => ({
          isGrounded: true,
          unsupportedClaims: [],
          remedyAction: 'ACCEPT' as const,
        }),
        generateFollowUps: async (params: any) => {
          receivedParams = params;
          return [
            {
              id: `fu_${params.parentInteractionId}_1`,
              question: 'ما حكم المبادرة بالتوبة عند ارتكاب الذنب؟',
              type: 'مفهوم مرتبط',
              origin: 'DEEP_LEARNING' as const,
              parentInteractionId: params.parentInteractionId,
            },
          ];
        },
      };

      setAIProvider(mockProvider as any);

      const res = await request(app)
        .post('/api/ask')
        .send({
          sessionId: 'session_patch3_test',
          question: 'ما هي شروط التوبة؟',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify that unsupported claims were NEVER passed to follow-up generator
      expect(receivedParams).toBeDefined();
      expect(receivedParams.keyClaims).toEqual(['الإقلاع عن الذنب والندم']);
      expect(receivedParams.keyClaims).not.toContain('دعوى مستخلصة غير مثبتة لا دليل عليها');
      expect(receivedParams.verifiedClaims).toEqual(['الإقلاع عن الذنب والندم']);
      expect(receivedParams.verifiedEvidenceExcerpts).toHaveLength(1);
    });
  });

  describe('2. UNSUPPORTED_PREMISE_BLOCKED & Deterministic Validation', () => {
    const verifiedContext = {
      originalQuestion: 'ما هي شروط التوبة الصادقة؟',
      groundedAnswer: 'شروط التوبة الصادقة ثلاثة: الإقلاع عن الذنب، والندم على ما فات، والعزم على عدم الرجوع إليه، امتثالاً لأمر الله تعالى.',
      verifiedClaims: ['الإقلاع والندم والعزم شروط لصحة التوبة'],
      evidenceExcerpts: [
        {
          title: 'شروط التوبة',
          sourceName: 'المحتوى الإسلامي',
          content: 'قال أهل العلم: التوبة واجبة من كل ذنب، وشروطها الإقلاع والندم والعزم الأكيد على عدم العود.',
        },
      ],
    };

    it('rejects follow-ups introducing personal fatwa queries', () => {
      const q = 'هل يجوز لي تأخير التوبة إذا كنت في ظروف صعبة؟';
      expect(validateFollowUpQuestion(q, verifiedContext)).toBe(false);
    });

    it('rejects follow-ups introducing unverified narrator attributions', () => {
      const q = 'ما صحة ما روي عن أبي هريرة في اشتراط رد المظالم للتوبة؟';
      expect(validateFollowUpQuestion(q, verifiedContext)).toBe(false);
    });

    it('rejects follow-ups introducing substantive unverified premises', () => {
      const q = 'كيف يؤثر تأخير التوبة على فساد المعاملات المالية في الأسواق؟';
      expect(validateFollowUpQuestion(q, verifiedContext)).toBe(false);
    });

    it('accepts follow-ups strictly grounded in verified context', () => {
      const q = 'ما دلالة اشتراط الندم والعزم في صحة التوبة عند أهل العلم؟';
      expect(validateFollowUpQuestion(q, verifiedContext)).toBe(true);
    });
  });

  describe('3. ZERO_TO_THREE_ALLOWED: Flexible Safe Question Count', () => {
    it('returns exactly 1 question when only 1 safe question passes validation', async () => {
      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        followUps: [
                          {
                            question: 'ما دلالة اشتراط الإقلاع والندم في التوبة؟', // Safe
                            type: 'دليل أعمق',
                          },
                          {
                            question: 'هل يجوز لي تأخير التوبة لعذر شخصي؟', // Fatwa -> dropped
                            type: 'سؤال تحليلي',
                          },
                          {
                            question: 'كيف أثرت التوبة في ظهور مذهب المعتزلة في البصرة؟', // Premise -> dropped
                            type: 'مفهوم مرتبط',
                          },
                        ],
                      }),
                    },
                  ],
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

      const questions = await provider.generateFollowUps({
        originalQuestion: 'ما هي شروط التوبة؟',
        groundedAnswer: 'شروط التوبة الإقلاع والندم والعزم.',
        parentInteractionId: 'int_count_1',
        verifiedClaims: ['الإقلاع والندم والعزم'],
        verifiedEvidenceExcerpts: [{ content: 'التوبة مشروطة بالإقلاع والندم والعزم.' }],
      });

      expect(questions).toHaveLength(1);
      expect(questions[0].question).toContain('الإقلاع والندم');
    });

    it('returns empty array [] when all generated questions contain unsupported premises', async () => {
      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        followUps: [
                          {
                            question: 'هل يجوز لي تأخير التوبة؟',
                            type: 'دليل أعمق',
                          },
                          {
                            question: 'ما رأي المعتزلة في التوبة؟',
                            type: 'مقارنة',
                          },
                        ],
                      }),
                    },
                  ],
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

      const questions = await provider.generateFollowUps({
        originalQuestion: 'ما هي شروط التوبة؟',
        groundedAnswer: 'شروط التوبة الإقلاع والندم والعزم.',
        parentInteractionId: 'int_count_0',
        verifiedClaims: ['الإقلاع والندم والعزم'],
      });

      expect(questions).toEqual([]);
    });
  });

  describe('4. KAABA_REGRESSION: Facing Kaaba Case', () => {
    it('blocks follow-up containing "توحيد القبلة يعزز وحدة المسلمين" when evidence does not establish it', () => {
      const kaabaContext = {
        originalQuestion: 'لماذا يتجه المسلمون إلى الكعبة في الصلاة؟ وهل هذا يعني أنهم يعبدونها؟',
        groundedAnswer: 'يتجه المسلمون إلى المسجد الحرام في صلاتهم امتثالاً لأمر الله تعالى، واستقبال القبلة شرط من شروط صحة الصلاة، ولا يعني التوجه إليها عبادتها بوجه من الوجوه، فإن المسلم لا يعبد إلا الله وحده لا شريك له.',
        verifiedClaims: [
          'التوجه إلى الكعبة طاعة لأمر الله وليس عبادة لها',
          'استقبال القبلة شرط لصحة الصلاة',
        ],
        evidenceExcerpts: [
          {
            title: 'استقبال القبلة',
            sourceName: 'المحتوى الإسلامي',
            content: 'استقبال القبلة في الصلاة طاعة لله تعالى وامتثال لأمره، وليس سجوداً للحجارة.',
          },
        ],
      };

      // Unverified premise: unity of Muslims
      const ungroundedQ = 'كيف ساهم توحيد القبلة في تعزيز وحدة المسلمين؟';
      expect(validateFollowUpQuestion(ungroundedQ, kaabaContext)).toBe(false);

      // Directly grounded question
      const groundedQ = 'ما دلالة الأمر بالتوجه إلى المسجد الحرام في الصلاة؟';
      expect(validateFollowUpQuestion(groundedQ, kaabaContext)).toBe(true);
    });
  });

  describe('5. IKHLAS_REGRESSION: Surah Al-Ikhlas Case', () => {
    it('blocks follow-ups introducing other surahs or theological movements not in evidence', () => {
      const ikhlasContext = {
        originalQuestion: 'كيف تدل سورة الإخلاص على توحيد الله؟',
        groundedAnswer: 'سورة الإخلاص سورة مكية تضمنت تقرير توحيد الله وتفرده بالألوهية، وأنه الصمد الذي يقصده الخلق في حوائجهم، ونفت عنه الشريك والنقص والمثيل.',
        verifiedClaims: ['سورة الإخلاص تقرر توحيد الله وتنفي الشريك والنقص'],
        evidenceExcerpts: [
          {
            title: 'تفسير سورة الإخلاص',
            sourceName: 'Quranpedia',
            content: 'سورة الإخلاص تثبت وحدانية الله تعالى وأنه الصمد المنزه عن الشريك والولد.',
          },
        ],
      };

      // Mentions other surah
      const otherSurahQ = 'ما وجه الجمع بين سورة الإخلاص وسورة الفلق في الرقية الشرعية؟';
      expect(validateFollowUpQuestion(otherSurahQ, ikhlasContext)).toBe(false);

      // Mentions theological movement
      const kalamQ = 'كيف وظف علماء الكلام سورة الإخلاص في الرد على المعتزلة؟';
      expect(validateFollowUpQuestion(kalamQ, ikhlasContext)).toBe(false);

      // Grounded concept in verified context
      const groundedQ = 'ما دلالة اسم الله الصمد على نفي الشريك والنقص؟';
      expect(validateFollowUpQuestion(groundedQ, ikhlasContext)).toBe(true);
    });
  });

  describe('6. HADITH_REGRESSION & INSUFFICIENT_FOLLOWUPS_EMPTY', () => {
    it('returns empty follow-ups when evidence is INSUFFICIENT ("حديث ابي هريره عن العلم")', async () => {
      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: 'حديث ابي هريره عن العلم',
        normalizedQuestion: 'حديث ابي هريرة عن فضل العلم',
        category: 'الحديث الشريف',
        task: 'تخريج حديث',
        topic: 'العلم',
        userGoal: 'معرفة الحديث',
        claims: ['حديث من سلك طريقا يلتمس فيه علما'],
        requestedEvidence: ['الدرر السنية'],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
        verifyEvidence: async () => ({
          chunkId: 'chk_1',
          claimId: 'claim_1',
          sourceId: 'src_dorar',
          verificationStatus: 'UNSUPPORTED' as const,
          confidence: 0.1,
          relation: 'غير مدعوم',
        }),
        generateGroundedAnswer: async () => ({
          answer: INSUFFICIENT_COVERAGE_NOTICE,
          citedChunkIds: [],
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
          sessionId: 'session_hadith_insufficient',
          question: 'حديث ابي هريره عن العلم',
          origin: 'USER',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('INSUFFICIENT');
      expect(res.body.data.answer).toContain(INSUFFICIENT_COVERAGE_NOTICE);
      // Follow-ups must be strictly empty
      expect(res.body.data.followUps).toEqual([]);
    });

    it('GeminiAIProvider.generateFollowUps returns [] immediately when answer contains INSUFFICIENT notice', async () => {
      const provider = new GeminiAIProvider({ apiKey: 'key' });
      const res = await provider.generateFollowUps({
        originalQuestion: 'حديث ابي هريره عن العلم',
        groundedAnswer: INSUFFICIENT_COVERAGE_NOTICE,
        parentInteractionId: 'int_fail',
      });
      expect(res).toEqual([]);
    });
  });

  describe('7. SAME_PIPELINE_PRESERVED, ORIGIN_PRESERVED, PARENT_LINK_PRESERVED', () => {
    it('submitting selected follow-up executes through identical pipeline with origin=DEEP_LEARNING and parentInteractionId', async () => {
      const parentId = 'int_parent_sample_99';
      const followUpQuestionText = 'ما الفرق بين أركان الإيمان وأركان الإسلام؟';

      const mockUnderstanding: QuestionUnderstandingResult = {
        originalQuestion: followUpQuestionText,
        normalizedQuestion: followUpQuestionText,
        category: 'العقيدة',
        task: 'بيان الأركان',
        topic: 'أركان الإيمان والإسلام',
        userGoal: 'معرفة الفرق',
        claims: ['أركان الإسلام خمسة وأركان الإيمان ستة'],
        requestedEvidence: [],
        needsClarification: false,
        isPersonalFatwa: false,
      };

      const mockProvider = {
        understandQuestion: async () => mockUnderstanding,
        verifyEvidence: async (p: any) => ({
          chunkId: p.candidateChunk?.chunkId || 'chk_1',
          claimId: p.claimId || 'claim_1',
          sourceId: 'src_ic',
          verificationStatus: 'SUPPORTED' as const,
          confidence: 0.9,
          relation: 'مدعوم',
        }),
        generateGroundedAnswer: async () => ({
          answer: 'أركان الإسلام خمسة وأركان الإيمان ستة كما بين النبي صلى الله عليه وسلم.',
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
          sessionId: 'session_same_pipeline_99',
          question: followUpQuestionText,
          origin: 'DEEP_LEARNING',
          parentInteractionId: parentId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.origin).toBe('DEEP_LEARNING');
      expect(res.body.data.parentInteractionId).toBe(parentId);
      expect(res.body.data.sessionId).toBe('session_same_pipeline_99');
    });
  });
});
