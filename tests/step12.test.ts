import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { interactionStorage } from '../src/server/storage/InMemoryInteractionStorage.js';
import {
  setAIProvider,
  getAIProvider,
} from '../src/server/ai/GeminiAIProvider.js';
import {
  OFFICIAL_REFERRAL_AUTHORITY,
  PERSONAL_FATWA_NOTICE,
} from '../src/shared/types/index.js';

const app = createApp();

describe('STEP 12 Focused Validation: Trusted Sources & Specialist Referral', () => {
  const originalProvider = getAIProvider();

  beforeEach(() => {
    interactionStorage.clear();
  });

  afterEach(() => {
    setAIProvider(originalProvider);
  });

  describe('1. Normal Question Gate vs. Personal Fatwa Detection', () => {
    it('NORMAL_QUESTION_GATE: standard knowledge question does NOT trigger specialist referral', async () => {
      const mockProvider = {
        understandQuestion: async () => ({
          originalQuestion: 'ما أركان الإيمان الستة؟',
          normalizedQuestion: 'ما أركان الإيمان الستة؟',
          category: 'العقيدة',
          task: 'بيان',
          topic: 'أركان الإيمان',
          userGoal: 'معرفة',
          claims: ['أركان الإيمان ستة هي الإيمان بالله وملائكته وكتبه ورسله واليوم الآخر والقدر'],
          requestedEvidence: [],
          needsClarification: false,
          isPersonalFatwa: false,
        }),
      };
      setAIProvider(mockProvider as any);

      const res = await request(app).post('/api/ask').send({
        sessionId: 'sess_normal_q',
        question: 'ما أركان الإيمان الستة؟',
        origin: 'USER',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).not.toBe('PERSONAL_FATWA');
      expect(res.body.data.specialistReferral).toBeUndefined();
    });

    it('PERSONAL_FATWA_DETECTION: individual fatwa question triggers PERSONAL_FATWA status', async () => {
      const mockProvider = {
        understandQuestion: async () => ({
          originalQuestion: 'طلقت زوجتي طلقتين وأنا غضبان، فهل يقع الطلاق؟',
          normalizedQuestion: 'طلقت زوجتي طلقتين وأنا غضبان فهل يقع الطلاق',
          category: 'الأحوال الشخصية',
          task: 'استفتاء',
          topic: 'الطلاق في الغضب',
          userGoal: 'حكم واقعة معينة',
          claims: [],
          requestedEvidence: [],
          needsClarification: false,
          isPersonalFatwa: true,
        }),
      };
      setAIProvider(mockProvider as any);

      const res = await request(app).post('/api/ask').send({
        sessionId: 'sess_fatwa_detect',
        question: 'طلقت زوجتي طلقتين وأنا غضبان، فهل يقع الطلاق؟',
        origin: 'USER',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PERSONAL_FATWA');
    });
  });

  describe('2. Fatwa Answer & Follow-ups Blocking', () => {
    it('FATWA_ANSWER_BLOCK: personal fatwa does NOT generate an answer or citations', async () => {
      const mockProvider = {
        understandQuestion: async () => ({
          originalQuestion: 'مسألة طلاق شخصية',
          normalizedQuestion: 'مسألة طلاق شخصية',
          category: 'الأحوال الشخصية',
          task: 'استفتاء',
          topic: 'طلاق',
          userGoal: 'فتوى',
          claims: [],
          requestedEvidence: [],
          needsClarification: false,
          isPersonalFatwa: true,
        }),
      };
      setAIProvider(mockProvider as any);

      const res = await request(app).post('/api/ask').send({
        sessionId: 'sess_fatwa_block',
        question: 'مسألة طلاق شخصية',
        origin: 'USER',
      });

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.status).toBe('PERSONAL_FATWA');
      expect(data.answer).toBeUndefined();
      expect(data.evidence).toEqual([]);
      expect(data.candidates).toEqual([]);
      expect(data.citations).toEqual([]);
    });

    it('FATWA_FOLLOWUPS_BLOCK: personal fatwa strictly suppresses Deep Learning follow-ups', async () => {
      const mockProvider = {
        understandQuestion: async () => ({
          originalQuestion: 'مسألة نزاع مالي بيني وبين شريكي',
          normalizedQuestion: 'نزاع مالي بين شريكين',
          category: 'المعاملات المالية',
          task: 'استفتاء',
          topic: 'نزاع مالي',
          userGoal: 'حكم واقعة',
          claims: [],
          requestedEvidence: [],
          needsClarification: false,
          isPersonalFatwa: true,
        }),
      };
      setAIProvider(mockProvider as any);

      const res = await request(app).post('/api/ask').send({
        sessionId: 'sess_fatwa_followups',
        question: 'مسألة نزاع مالي بيني وبين شريكي',
        origin: 'USER',
      });

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.status).toBe('PERSONAL_FATWA');
      expect(data.followUps).toEqual([]);
    });
  });

  describe('3. Official Referral Data & Security', () => {
    it('OFFICIAL_REFERRAL_DATA: returns the exact official authority info and standard notice', async () => {
      const mockProvider = {
        understandQuestion: async () => ({
          originalQuestion: 'استفتاء شخصي',
          normalizedQuestion: 'استفتاء شخصي',
          category: 'فتوى',
          task: 'استفتاء',
          topic: 'خاص',
          userGoal: 'فتوى',
          claims: [],
          requestedEvidence: [],
          needsClarification: false,
          isPersonalFatwa: true,
        }),
      };
      setAIProvider(mockProvider as any);

      const res = await request(app).post('/api/ask').send({
        sessionId: 'sess_official_ref',
        question: 'استفتاء شخصي',
        origin: 'USER',
      });

      expect(res.status).toBe(200);
      const ref = res.body.data.specialistReferral;
      expect(ref).toBeDefined();
      expect(ref.authorityName).toBe('الرئاسة العامة للبحوث العلمية والإفتاء');
      expect(ref.officialWebsite).toBe('https://www.alifta.gov.sa');
      expect(ref.contactMethods.unifiedPhone).toBe('0114595555');
      expect(ref.contactMethods.religiousQuestionsEmail).toBe('alifta@alifta.gov.sa');
      expect(ref.contactMethods.administrativeEmail).toBe('info@alifta.gov.sa');
      expect(ref.message).toContain(PERSONAL_FATWA_NOTICE);
    });

    it('NO_UNOFFICIAL_CONTACTS: rejects invented scholars, personal numbers, and WhatsApp links', async () => {
      const res = await request(app).get('/api/specialist');
      expect(res.status).toBe(200);
      const data = res.body.data;

      // Only official authority data
      expect(data.authorityName).toBe('الرئاسة العامة للبحوث العلمية والإفتاء');
      expect(data.officialWebsite).toBe('https://www.alifta.gov.sa');

      // Verify absence of unofficial contacts
      const payloadString = JSON.stringify(data);
      expect(payloadString).not.toContain('whatsapp');
      expect(payloadString).not.toContain('wa.me');
      expect(payloadString).not.toContain('05'); // personal Saudi mobile prefix
    });
  });

  describe('4. Source and Referral Strict Separation', () => {
    it('SOURCE_REFERRAL_SEPARATION: sources list contains ONLY knowledge sources, never specialist contacts', async () => {
      const sourcesRes = await request(app).get('/api/sources');
      expect(sourcesRes.status).toBe(200);
      const sources = sourcesRes.body.data;

      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBeGreaterThanOrEqual(4);

      // Verify that no referral authority or contact info leaked into sources
      for (const s of sources) {
        expect(s.sourceId).not.toContain('fatwa');
        expect(s.sourceId).not.toContain('specialist');
        expect(s.name).not.toContain('الرئاسة العامة للبحوث العلمية والإفتاء');
        expect(s.officialUrl).not.toContain('alifta.gov.sa');
      }
    });

    it('DORAR_STATUS_TRUTHFUL: Dorar.net is reported as REGISTERED_NOT_INGESTED due to HTTP 403', async () => {
      const res = await request(app).get('/api/sources');
      expect(res.status).toBe(200);
      const sources = res.body.data;

      const dorar = sources.find((s: any) => s.sourceId === 'src_dorar');
      expect(dorar).toBeDefined();
      expect(dorar.status).toBe('REGISTERED_NOT_INGESTED');
      expect(dorar.documentCount).toBe(0);
      expect(dorar.statusNote).toContain('403');
    });
  });

  describe('5. UI Client Integration', () => {
    it('SOURCES_UI: mishkatApi successfully retrieves sources with status information', async () => {
      const { mishkatApi } = await import('../src/client/api/mishkatApi.js');

      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async (url: any) => {
          const urlStr = String(url);
          if (urlStr.includes('/sources')) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [
                  {
                    sourceId: 'src_quranpedia',
                    name: 'Quranpedia',
                    author: 'مشروع القرآن',
                    category: 'التفسير',
                    description: 'موسوعة قرآنية',
                    isVerified: true,
                    status: 'INGESTED',
                    documentCount: 20,
                  },
                  {
                    sourceId: 'src_dorar',
                    name: 'الدرر السنية',
                    author: 'الشيخ علوي السقاف',
                    category: 'الحديث',
                    description: 'موسوعة الحديث',
                    isVerified: true,
                    status: 'REGISTERED_NOT_INGESTED',
                    documentCount: 0,
                  },
                ],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(JSON.stringify({}), { status: 404 });
        };

        const sourcesRes = await mishkatApi.getSources();
        expect(sourcesRes.success).toBe(true);
        expect(sourcesRes.data?.length).toBe(2);
        expect(sourcesRes.data?.[1].status).toBe('REGISTERED_NOT_INGESTED');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('SPECIALIST_UI: mishkatApi successfully retrieves official authority referral data', async () => {
      const { mishkatApi } = await import('../src/client/api/mishkatApi.js');

      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async (url: any) => {
          const urlStr = String(url);
          if (urlStr.includes('/specialist')) {
            return new Response(
              JSON.stringify({
                success: true,
                data: {
                  authorityName: OFFICIAL_REFERRAL_AUTHORITY.authorityName,
                  officialWebsite: OFFICIAL_REFERRAL_AUTHORITY.officialWebsite,
                  contactMethods: OFFICIAL_REFERRAL_AUTHORITY.contactMethods,
                  purpose: OFFICIAL_REFERRAL_AUTHORITY.purpose,
                  message: PERSONAL_FATWA_NOTICE,
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(JSON.stringify({}), { status: 404 });
        };

        const specRes = await mishkatApi.getSpecialistReferral();
        expect(specRes.success).toBe(true);
        expect(specRes.data?.authorityName).toBe('الرئاسة العامة للبحوث العلمية والإفتاء');
        expect(specRes.data?.contactMethods?.unifiedPhone).toBe('0114595555');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
