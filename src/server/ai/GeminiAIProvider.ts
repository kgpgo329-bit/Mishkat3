import {
  AIProvider,
  UnderstandQuestionParams,
  VerifyEvidenceParams,
  GenerateGroundedAnswerParams,
  GroundedAnswerResult,
  ValidateGroundingParams,
  GenerateFollowUpsParams,
  GenerateAssessmentParams,
  GenerateReportParams,
} from './AIProvider.js';
import {
  QuestionUnderstandingResult,
  EvidenceVerificationResult,
  GroundingValidationResult,
  FollowUpQuestion,
  AssessmentRecord,
  AssessmentQuestionServer,
  FinalReportRecord,
  ReportTopicPerformance,
  ReportFeedbackArea,
} from '../../shared/types/index.js';
import { QuestionUnderstandingResultSchema } from '../../shared/schemas/index.js';
import { MishkatError } from '../../shared/errors/MishkatError.js';
import { config } from '../config/config.js';

export interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

const SYSTEM_UNDERSTANDING_PROMPT = `أنت وحدة الفهم الدلالي لمسائل منصة "مشكاة" للمعرفة الإسلامية.
مهمتك حصرية في تحليل وفهم السؤال وتفكيكه دلالياً وتخطيط دعاويه دون الإجابة عنه مطلقاً.

تعليمات صارمة:
1. لا تجب عن السؤال الشرعي بأي حال من الأحوال.
2. لا تستشهد بنصوص آيات أو أحاديث أو أدلة تفصيلية.
3. لا تصدر أحكاماً شرعية أو فتاوى.
4. قم بتفكيك السؤال إلى دعاوى ذرية (Atomic Claims) تمثل القضايا المعرفية اللازمة لإجابة السؤال بدقة:
   - يجب أن تكون كل دعوى قضية موضوعية مستقلة وموجزة وقابلة للتحقق بمفردها (Atomic & Independently Verifiable).
   - تجنب الدعاوى المركبة أو الفضفاضة.
   - لا تحول الأسئلة الشكوكية أو الشبهات إلى افتراضات تثبت الشبهة (مثال: في سؤال "هل القرآن من تأليف محمد؟" لا تضع دعوى تفترض تأليف محمد، بل صغ الدعاوى المعرفية الموضوعية: بيان مصدر القرآن الإلهي ونفي كونه من تأليف البشر. وفي سؤال "هل انتشر الإسلام بالسيف؟" صغ الدعوى: انتشار الإسلام بالدعوة والاقتناع، ومشروعية القتال كانت للدفاع ورد العدوان ومنع الإكراه).
   - اجعل عدد الدعاوى بين 2 إلى 4 دعاوى دقيقة ومباشرة تعبر عن صلب المسألة دون استطراد.
5. إذا كان السؤال غامضاً أو مبهماً جداً بحيث يتعذر فهم مقصوده بأمان، اجعل needsClarification = true واذكر clarificationReason وجيزاً دون تخمين مراد السائل.
6. إذا كان السؤال نازلة شخصية أو فتوى فردية خاصة (مثل قضايا الطلاق المعين، نزاعات أسرية أو مالية خاصة)، اجعل isPersonalFatwa = true ولا تجب عليه.
7. أرجع فقط كائن JSON مطابق تماماً للهيكل التالي دون أي نص إضافي:
{
  "originalQuestion": string,
  "normalizedQuestion": string,
  "category": string,
  "task": string,
  "topic": string,
  "userGoal": string,
  "claims": string[],
  "requestedEvidence": string[],
  "needsClarification": boolean,
  "clarificationReason": string,
  "isPersonalFatwa": boolean
}`;

const SYSTEM_VERIFICATION_PROMPT = `أنت وحدة التحقق من الأدلة (Evidence Verifier) لمنصة "مشكاة" للمعرفة الإسلامية.
مهمتك حصرية في الحكم الموضوعي الدقيق: هل النص المصدري المرفق يدعم الدعوى الذرية المعطاة؟

قواعد صارمة:
1. التقييم مقيد حصراً بالنص المعطى (Source-Bound): لا تستخدم أي معلومات خارجية، ولا تستحضر نصوصاً أو فتاوى أو وقائع غير مذكورة في النص.
2. لا تجب عن السؤال ولا تفتِ ولا تبدِ رأياً دينياً شخصياً.
3. تطابق الكلمات المفتاحية وحده لا يجعل الدليل مدعوماً. يجب أن تؤيد دلالة النص الدعوى فعلياً.
4. حالات التحقق المسموحة حصراً:
   - "SUPPORTED": النص المصدري يؤيد صراحة ومباشرة القضية المطروحة في الدعوى الذرية.
   - "PARTIAL": النص المصدري يمس الموضوع أو يؤيد جزءاً من الدعوى ولكن ينقصه إثبات القضية بالكامل.
   - "UNSUPPORTED": النص المصدري لا يؤيد الدعوى، أو يخرج عنها، أو يناقضها، أو هو مجرد تشابه ألفاظ دون تأييد المضمون.
5. أرجع فقط كائن JSON مطابق تماماً للهيكل التالي دون أي نص إضافي:
{
  "verificationStatus": "SUPPORTED" | "PARTIAL" | "UNSUPPORTED",
  "confidence": number,
  "relation": string
}`;

const SYSTEM_ANSWER_PROMPT = `أنت وحدة الصياغة والتأصيل المعرفي (Grounded Answer Synthesizer) لمنصة "مشكاة" للمعرفة الإسلامية.
مهمتك: صياغة إجابة موثوقة وموجزة وواضحة باللغة العربية معتمدة حصراً ومباشرة على نصوص الأدلة الموثقة المرفقة فقط.

قواعد صارمة لا تقبل الاستثناء:
1. التقييد التام بالأدلة (Strict Source-Bound): لا تذكر أي حقيقة شرعية أو تاريخية، ولا تستشهد بأي آية أو حديث أو فتوى لم ترد صراحة في نصوص الأدلة المرفقة.
2. أنت مُلخِّص ومُرتب للأدلة المعتمدة، ولستَ مصدراً دينياً بذاتك ولا تنشئ أحكاماً من عندك.
3. الأسلوب: لغة عربية فصيحة، واضحة، تعليمية، هادئة، موضوعية، تناسب عموم القراء.
4. الشبهات والأسئلة الاستنكارية: أجب ببيان علمي هادئ قائم على الأدلة المرفقة دون لغة دفاعية أو سجالية.
5. إذا كانت الأدلة المرفقة جزئية (PARTIAL): أجب عن الجزئية المدعومة فقط، واختم الإجابة بتنبيه صريح:
"تنبيه: المصادر المعتمدة المتوفرة حالياً تجيب جزئياً عن السؤال، ولم تتوفر تغطية كافية لجميع جوانبه."
6. لا تختلق أرقام أو معرفات مراجع (Chunk IDs)، واذكر في مصفوفة citedChunkIds فقط المعرفات التي استندت إليها فعلاً من قائمة المعرفات المرفقة.
7. أرجع كائن JSON صالح فقط دون أي نص إضافي:
{
  "answer": string,
  "citedChunkIds": string[],
  "inferredClaims": string[]
}`;

const SYSTEM_GROUNDING_PROMPT = `أنت وحدة التحقق من التأصيل (Grounding Validator) لمنصة "مشكاة".
مهمتك: فحص الإجابة المصوغة والتأكد من أن كل جملة وفكرة فيها مستندة حصراً إلى نصوص الأدلة المعتمدة المرفقة، وخلوها من أي معلومات خارجية مضافة.

القواعد:
1. إذا كانت جميع دعاوى وأفكار الإجابة مستندة للأدلة المرفقة، اجعل isGrounded = true ومصفوفة unsupportedClaims فارغة، و remedyAction = "ACCEPT".
2. إذا تضمنت الإجابة أي معلومات أو وقائع أو نصوص غير موجودة في الأدلة المرفقة، اجعل isGrounded = false واذكر الجمل غير المؤصلة في unsupportedClaims، واجعل remedyAction = "DOWNGRADE".
3. أرجع كائن JSON صالح فقط:
{
  "isGrounded": boolean,
  "unsupportedClaims": string[],
  "remedyAction": "ACCEPT" | "DOWNGRADE"
}`;

const SYSTEM_FOLLOWUPS_PROMPT = `أنت وحدة توليد أسئلة التعلم العميق المقيدة بالأدلة (Evidence-Constrained Deep Learning Follow-Ups) لمنصة "مشكاة".
مهمتك: اقتراح من 0 إلى 3 أسئلة تعليمية عربية دقيقة وموجزة، مستندة حصراً وبشكل صارم إلى الأدلة المحققة والإجابة المؤصلة المرفقة دون أي مقدمات أو فرضيات غير مثبتة.

قواعد قطعية لا تقبل الاستثناء:
1. التقييد الصارم بالأدلة: يجب ألا يتضمن أي سؤال مقترح أي مقدمة أو فرضية دينية أو تاريخية أو كلامية أو فقهية جديدة لم تثبت في الأدلة المحققة أو الإجابة المرفقة.
2. حظر المقدمات غير المثبتة:
   - مثال: إذا أثبت الدليل أمر المسلمين بالتوجه للكعبة فقط:
     * مسموح: "ما دلالة الأمر بالتوجه إلى المسجد الحرام في الصلاة؟"
     * ممنوع قطعاً: "كيف ساهم توحيد القبلة في تعزيز وحدة المسلمين؟" لأن فرضية أثر ذلك على وحدة المسلمين لم ترد في الدليل.
   - إذا سئل عن سورة الإخلاص: لا تقحم سوراً أخرى أو آثاراً خارجية لم ترد في الدليل المحقق.
3. عدم افتراض وقائع أو أحاديث: لا تنسب حديثاً ولا تثبت حكماً خارج الأدلة المرفقة.
4. تجنب الفتاوى الخاصة: لا تصغ أسئلة شخصية أو استفتاءات فردية.
5. عدد الأسئلة: اقترح من 0 إلى 3 أسئلة فقط. الجودة والتوثيق مقدمان على العدد؛ إذا توفر سؤال واحد موثق فقط فاكتفِ به، وإن لم يتوفر أي سؤال موثق تماماً فأرجع مصفوفة فارغة.
6. صنّف كل سؤال إلى نوع محدد: ('دليل أعمق' | 'مفهوم مرتبط' | 'مقارنة' | 'أثر المسألة' | 'سؤال تحليلي').
7. أرجع كائن JSON صالح فقط دون أي نص إضافي:
{
  "followUps": [
    {
      "question": "نص السؤال التعليمي المقيد بالدليل",
      "type": "دليل أعمق"
    }
  ]
}`;

const SYSTEM_ASSESSMENT_PROMPT = `أنت وحدة إنشاء التقييم المعرفي المخصص (Personalized Assessment Generator) لمنصة "مشكاة".
مهمتك: صياغة 5 أسئلة اختيار من متعدد (Multiple-Choice Questions) باللغة العربية الفصيحة، مستندة حصراً إلى المعارف والمسائل المحققة المرفقة من رحلة المستخدم.

قواعد صارمة لا تقبل الاستثناء:
1. العدد: قم بصياغة 5 أسئلة بالضبط.
2. الخيارات: كل سؤال يجب أن يحتوي على 4 خيارات حصرية بالضبط في مصفوفة options.
3. الإجابة الصحيحة: حدد مؤشر الخيار الصحيح كرقم من 0 إلى 3 (correctOptionId). خيار صحيح واحد فقط لكل سؤال.
4. الأسلوب: لغة عربية فصيحة، تعليمية، غير تعجيزية ولا ملتوية، تختبر الفهم والاستيعاب للمفاهيم الشرعية بدلاً من الحفظ الحرفي.
5. التوثيق والتأصيل (Traceability): كل سؤال يجب أن يرتبط بمسألة محققة واحدة على الأقل من المسائل المرفقة، ويُذكر معرّفها في sourceInteractionIds.
6. لا تبتكر حقائق دينية جديدة خارج المعارف المرفقة، وتجنب الفتاوى الشخصية أو النوازل الفردية.
7. أرجع كائن JSON صالح فقط دون أي نصوص إضافية:
{
  "questions": [
    {
      "id": "q1",
      "question": "نص السؤال",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctOptionId": 0,
      "explanation": "شرح علمي موجز لسبب صحة هذا الخيار",
      "sourceInteractionIds": ["معرف المسألة المرجعية"]
    }
  ]
}`;

const SYSTEM_REPORT_PROMPT = `أنت وحدة صياغة التقرير المعرفي الختامي لمنصة "مشكاة" للمعرفة الإسلامية.
مهمتك: صياغة التقييم النوعي والتربوي باللغة العربية الفصحى الرصينة بناءً على أداء المستخدم في رحلته وتقييمه المكتمل فقط.

تعليمات صارمة لا تقبل الاستثناء:
1. التقرير خاص بأداء وفهم المستخدم في رحلته المعرفية، ويُمنع منعاً باتاً استحداث أو إضافة أي معلومات أو شروح دينية أو أحكام شرعية جديدة لم تكن ضمن المسائل المكتملة في رحلته.
2. لا تحسب أي درجات أو نسب مئوية أو أعداد إحصائية (يقوم بها الخادم حسابياً).
3. نقاط القوة (strengths) ومجالات المراجعة (reviewAreas) يجب أن تكون مسندة حصراً إلى المعرّفات المزودة (assessmentQuestionIds و sourceInteractionIds).
4. قدم ملخصاً تربوياً موجزاً (learningSummary) يصف مسار استيعاب المستخدم، و2 إلى 3 توصيات تعليمية منهجية (recommendations).

المخرجات المطلوبة بصيغة JSON فقط:
{
  "learningSummary": "ملخص تربوي موجز لأداء المستخدم",
  "strengths": [
    {
      "area": "صياغة موجزة لنقطة القوة في مسألة محددة",
      "assessmentQuestionIds": ["q1"],
      "sourceInteractionIds": ["int_..."]
    }
  ],
  "reviewAreas": [
    {
      "area": "صياغة موجزة لمجال يحتاج مراجعة أو تعميقاً",
      "assessmentQuestionIds": ["q2"],
      "sourceInteractionIds": ["int_..."]
    }
  ],
  "recommendations": [
    "توصية تعليمية 1",
    "توصية تعليمية 2"
  ]
}
`;

/**
 * Normalizes Arabic text for grounding and premise verification.
 */
export function normalizeArabicForFollowUp(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Harakat
    .replace(/[أإآا]/g, 'ا')
    .replace(/[يى]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '') // remove Tatweel
    .replace(/[؟?,.!،؛:()\"\'«»\-\[\]]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const PERSONAL_FATWA_PATTERNS = [
  'هل يجوز لي',
  'ما حكمي',
  'هل يلزمني',
  'هل علي كفاره',
  'انا شخصيا',
  'ماذا افعل اذا',
  'هل يجب علي',
  'هل صلاتي صحيحه',
  'هل صيامي صحيح',
  'هل وقع طلاقي',
];

const SPECIFIC_HISTORICAL_THEOLOGICAL_TERMS = [
  'وحده المسلمين',
  'وحده الصف',
  'اجتماع الكلمه',
  'توحيد الصف',
  'تعزيز وحده',
  'سوره الفلق',
  'سوره الناس',
  'سوره الكافرون',
  'علم الكلام',
  'المعتزله',
  'الاشاعره',
  'الجهميه',
  'المرجئه',
  'الخوارج',
];

const NARRATOR_KEYWORDS = [
  'ابو هريره',
  'ابن عباس',
  'ابن عمر',
  'عائشه',
  'انس بن مالك',
  'البخاري',
  'مسلم',
  'الترمذي',
  'ابو داود',
  'النسائي',
  'ابن ماجه',
  'احمد بن حنبل',
];

const ARABIC_ALLOWED_FRAMING_TOKENS = new Set([
  'ما', 'ماذا', 'كيف', 'لماذا', 'هل', 'اين', 'متي', 'كم', 'من', 'عن', 'في',
  'علي', 'الي', 'مع', 'بين', 'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي',
  'الذين', 'ان', 'كان', 'يكون', 'هو', 'هي', 'هم', 'كل', 'بعض', 'غير',
  'او', 'ثم', 'قد', 'لا', 'لم', 'لن', 'دلاله', 'معني', 'حكم', 'بيان',
  'وجه', 'اهميه', 'اثر', 'سؤال', 'مساله', 'حول', 'عند', 'اذا', 'مفهوم',
  'علاقه', 'دور', 'توجيه', 'تاصيل', 'نص', 'الشرع', 'الاسلام', 'الدين',
  'الله', 'تعالي', 'رسول', 'صلي', 'وسلم', 'النبي', 'رب', 'كتاب', 'سوره',
  'ايه', 'ايات', 'اهل', 'علم', 'معرفه', 'فهم', 'ربط', 'تحليل', 'استدلال',
  'دليل', 'ادله', 'اصل', 'اصول', 'قاعده', 'قواعد', 'فرع', 'فروع', 'مقصد',
  'مقاصد', 'غرض', 'حكمه', 'سبب', 'شان', 'امر', 'نهي', 'مشروعيه', 'تشريع'
]);

/**
 * Validates whether a generated follow-up question introduces unsupported premises
 * or requires knowledge absent from the verified context.
 */
export function validateFollowUpQuestion(
  question: string,
  context: {
    originalQuestion: string;
    groundedAnswer: string;
    verifiedClaims?: string[];
    evidenceExcerpts?: Array<{ title?: string; sourceName?: string; content: string }>;
  }
): boolean {
  if (!question || question.trim().length < 5) {
    return false;
  }

  const normQ = normalizeArabicForFollowUp(question);

  // 1. Personal fatwa check
  for (const pf of PERSONAL_FATWA_PATTERNS) {
    if (normQ.includes(pf)) {
      return false;
    }
  }

  // Compile full normalized verified context
  const fullContextText = [
    context.groundedAnswer || '',
    (context.verifiedClaims || []).join(' '),
    (context.evidenceExcerpts || []).map((e) => `${e.title || ''} ${e.content || ''}`).join(' '),
    context.originalQuestion || '',
  ].join(' ');

  const normCtx = normalizeArabicForFollowUp(fullContextText);

  // 2. Specific theological/historical/surah premise checks
  for (const term of SPECIFIC_HISTORICAL_THEOLOGICAL_TERMS) {
    if (normQ.includes(term) && !normCtx.includes(term)) {
      return false;
    }
  }

  // 3. Unverified Hadith / Narrator attribution check
  for (const narrator of NARRATOR_KEYWORDS) {
    if (normQ.includes(narrator) && !normCtx.includes(narrator)) {
      return false;
    }
  }

  // 4. Substantive content token grounding
  const qTokens = normQ.split(/\s+/).filter((t) => t.length >= 3);
  let ungroundedSubstantiveCount = 0;

  for (const token of qTokens) {
    if (ARABIC_ALLOWED_FRAMING_TOKENS.has(token)) {
      continue;
    }

    const stripped = token.replace(/^(ال|و|ف|ب|ل|ك)/, '');
    const inCtx = normCtx.includes(token) || (stripped.length >= 3 && normCtx.includes(stripped));

    if (!inCtx) {
      ungroundedSubstantiveCount++;
    }
  }

  if (ungroundedSubstantiveCount > 1) {
    return false;
  }

  return true;
}

export class GeminiAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private fetchFn: typeof fetch;

  constructor(options?: GeminiProviderOptions) {
    this.apiKey = options?.apiKey ?? config.gemini.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.model = options?.model ?? config.gemini.model ?? 'gemini-1.5-pro';
    this.timeoutMs = options?.timeoutMs ?? Math.min(config.gemini.timeoutMs, 8000);
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  async understandQuestion(params: UnderstandQuestionParams): Promise<QuestionUnderstandingResult> {
    if (!params.question || params.question.trim().length === 0) {
      throw MishkatError.badRequest('السؤال مطلوب للتحليل الدلالي');
    }

    if (!this.apiKey) {
      throw new MishkatError(
        'AI_SERVICE_UNAVAILABLE',
        'مفتاح خدمة الذكاء الاصطناعي (GEMINI_API_KEY) غير مهيأ في الخادم',
        503
      );
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const promptText = `السؤال الأصلي: "${params.question.trim()}"${
      params.categoryHint ? `\nالتصنيف المبدئي المقترح: "${params.categoryHint}"` : ''
    }`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      systemInstruction: {
        parts: [{ text: SYSTEM_UNDERSTANDING_PROMPT }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    let attempt = 0;
    const maxAttempts = 2; // At most 1 retry for transient failures

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await this.fetchFn(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          if (response.status === 429) {
            throw MishkatError.quotaExhausted();
          }
          if (response.status >= 500 && attempt < maxAttempts) {
            continue; // Transient failure retry
          }
          throw new MishkatError(
            'AI_SERVICE_UNAVAILABLE',
            `فشل استدعاء مزود الذكاء الاصطناعي (رمز الاستجابة: ${response.status})`,
            response.status >= 500 ? 503 : 500
          );
        }

        const data = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new MishkatError(
            'AI_SERVICE_UNAVAILABLE',
            'استجابة الذكاء الاصطناعي خالية من المحتوى النصي',
            502
          );
        }

        // Clean any accidental markdown wrap
        const cleanedText = rawText
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '');

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(cleanedText);
        } catch {
          throw new MishkatError(
            'AI_SERVICE_UNAVAILABLE',
            'استجابة الذكاء الاصطناعي غير صالحة ولا تطابق بنية JSON',
            502
          );
        }

        // Validate strictly against QuestionUnderstandingResultSchema
        const validated = QuestionUnderstandingResultSchema.safeParse(parsedJson);
        if (!validated.success) {
          throw new MishkatError(
            'AI_SERVICE_UNAVAILABLE',
            'مخطط الفهم الدلالي غير مطابق للمواصفات المعتمدة',
            502,
            validated.error.errors
          );
        }

        return validated.data;
      } catch (err: unknown) {
        if (err instanceof MishkatError) {
          throw err;
        }

        const isAbort = (err as { name?: string })?.name === 'AbortError';
        if (isAbort) {
          if (attempt < maxAttempts) {
            continue;
          }
          throw new MishkatError(
            'AI_SERVICE_UNAVAILABLE',
            'تجاوز مزود الذكاء الاصطناعي المهلة المحددة للمعالجة',
            504
          );
        }

        if (attempt < maxAttempts) {
          continue;
        }

        throw new MishkatError(
          'AI_SERVICE_UNAVAILABLE',
          'تعذر الاتصال بمزود الذكاء الاصطناعي',
          503
        );
      }
    }

    throw new MishkatError('AI_SERVICE_UNAVAILABLE', 'فشل في تحليل السؤال دلالياً بعد المحاولة', 503);
  }

  async verifyEvidence(params: VerifyEvidenceParams): Promise<EvidenceVerificationResult> {
    const evidenceId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const claimId = params.claimId || 'claim_default';

    if (!params.claim || !params.candidateChunk || !params.candidateChunk.text) {
      return {
        evidenceId,
        claimId,
        sourceId: params.candidateChunk?.sourceId || 'unknown',
        chunkId: params.candidateChunk?.chunkId || 'unknown',
        relation: 'بيانات التحقق غير مكتملة',
        verificationStatus: 'VERIFICATION_FAILED',
        confidence: 0,
      };
    }

    if (!this.apiKey) {
      return {
        evidenceId,
        claimId,
        sourceId: params.candidateChunk.sourceId,
        chunkId: params.candidateChunk.chunkId,
        relation: 'مفتاح خدمة التحقق الآلي غير متوفر',
        verificationStatus: 'VERIFICATION_FAILED',
        confidence: 0,
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const promptText = `الدعوى الذرية المراد التحقق منها:
"${params.claim.trim()}"

عنوان النص المصدري: "${params.candidateChunk.title || ''}"
المصدر: "${params.candidateChunk.sourceId || ''}"
محتوى النص المصدري:
"""
${params.candidateChunk.text.substring(0, 2048).trim()}
"""`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      systemInstruction: {
        parts: [{ text: SYSTEM_VERIFICATION_PROMPT }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.0,
      },
    };

    let attempt = 0;
    const maxAttempts = 2;
    const timeoutMs = Math.min(this.timeoutMs, 6000); // 6s short timeout for verifier

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await this.fetchFn(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          if (response.status >= 500 && attempt < maxAttempts) {
            continue;
          }
          return {
            evidenceId,
            claimId,
            sourceId: params.candidateChunk.sourceId,
            chunkId: params.candidateChunk.chunkId,
            relation: `فشل مزود التحقق (رمز الاستجابة: ${response.status})`,
            verificationStatus: 'VERIFICATION_FAILED',
            confidence: 0,
          };
        }

        const data = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          return {
            evidenceId,
            claimId,
            sourceId: params.candidateChunk.sourceId,
            chunkId: params.candidateChunk.chunkId,
            relation: 'استجابة التحقق خالية من النص',
            verificationStatus: 'VERIFICATION_FAILED',
            confidence: 0,
          };
        }

        const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        let parsed: { verificationStatus?: string; confidence?: number; relation?: string };
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          return {
            evidenceId,
            claimId,
            sourceId: params.candidateChunk.sourceId,
            chunkId: params.candidateChunk.chunkId,
            relation: 'استجابة التحقق غير صالحة البنية',
            verificationStatus: 'VERIFICATION_FAILED',
            confidence: 0,
          };
        }

        const validStatuses = ['SUPPORTED', 'PARTIAL', 'UNSUPPORTED'];
        if (!parsed.verificationStatus || !validStatuses.includes(parsed.verificationStatus)) {
          return {
            evidenceId,
            claimId,
            sourceId: params.candidateChunk.sourceId,
            chunkId: params.candidateChunk.chunkId,
            relation: 'حالة التحقق المسترجعة غير مطابقة للمواصفات',
            verificationStatus: 'VERIFICATION_FAILED',
            confidence: 0,
          };
        }

        return {
          evidenceId,
          claimId,
          sourceId: params.candidateChunk.sourceId,
          chunkId: params.candidateChunk.chunkId,
          relation: parsed.relation || 'تم التحقق من الدليل بمطابقة النص المصدري',
          verificationStatus: parsed.verificationStatus as any,
          confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.8,
        };
      } catch (err: unknown) {
        if (attempt < maxAttempts) {
          continue;
        }
        return {
          evidenceId,
          claimId,
          sourceId: params.candidateChunk.sourceId,
          chunkId: params.candidateChunk.chunkId,
          relation: 'تعذر الاتصال بمزود التحقق أو انقضت المهلة الزمنية',
          verificationStatus: 'VERIFICATION_FAILED',
          confidence: 0,
        };
      }
    }

    return {
      evidenceId,
      claimId,
      sourceId: params.candidateChunk.sourceId,
      chunkId: params.candidateChunk.chunkId,
      relation: 'انتهت محاولات التحقق الآلي دون استجابة',
      verificationStatus: 'VERIFICATION_FAILED',
      confidence: 0,
    };
  }

  async generateGroundedAnswer(params: GenerateGroundedAnswerParams): Promise<GroundedAnswerResult> {
    if (!this.apiKey) {
      throw new MishkatError('AI_SERVICE_UNAVAILABLE', 'مفتاح Gemini API غير مهيأ لتوليد الإجابة', 503);
    }

    // Filter evidence to accepted (SUPPORTED or usable PARTIAL)
    const acceptedEv = params.verifiedEvidence.filter(
      (ev) => ev.verificationStatus === 'SUPPORTED' || ev.verificationStatus === 'PARTIAL'
    );

    if (acceptedEv.length === 0 || params.chunks.length === 0) {
      return {
        answer: 'لم أجد في المصادر المعتمدة المتاحة أدلة كافية لصياغة إجابة موثوقة عن هذا السؤال.',
        citedChunkIds: [],
        inferredClaims: [],
      };
    }

    const validChunkIds = new Set(params.chunks.map((c) => c.chunkId));
    const evidenceTextBlocks = acceptedEv
      .map((ev, i) => {
        const chunk = params.chunks.find((c) => c.chunkId === ev.chunkId);
        if (!chunk) return null;
        return `[دليل ${i + 1}] المعرف: ${chunk.chunkId}
المصدر: ${chunk.sourceId} — ${chunk.title}
النص المعتمد:
"${chunk.text}"
القضية التي يدعمها: ${ev.relation}`;
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    const promptText = `السؤال: "${params.question}"

نصوص الأدلة المعتمدة المتاحة حصراً:
${evidenceTextBlocks}

قم بصياغة إجابة موثوقة مستندة حصراً إلى نصوص الأدلة السابقة، مع ذكر معرفات الأدلة المستخدمة في citedChunkIds.`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_ANSWER_PROMPT }],
      },
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    };

    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const response = await this.fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (attempt < maxAttempts) continue;
          throw new MishkatError('AI_SERVICE_UNAVAILABLE', `فشل توليد الإجابة من Gemini: ${response.status}`, response.status);
        }

        const data = (await response.json()) as any;
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error('استجابة توليد الإجابة فارغة');
        }

        const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const parsed = JSON.parse(cleaned);

        // Strict filter: only include cited chunk IDs that actually exist in accepted evidence
        const safeCitedChunkIds = Array.isArray(parsed.citedChunkIds)
          ? parsed.citedChunkIds.filter((id: string) => validChunkIds.has(id))
          : [];

        // If the model cited no chunks, fallback to accepted chunk IDs
        const finalCitedChunkIds = safeCitedChunkIds.length > 0 ? safeCitedChunkIds : Array.from(validChunkIds);

        return {
          answer: parsed.answer || '',
          citedChunkIds: finalCitedChunkIds,
          inferredClaims: Array.isArray(parsed.inferredClaims) ? parsed.inferredClaims : [],
        };
      } catch (err: unknown) {
        if (attempt < maxAttempts) continue;
        throw new MishkatError(
          'AI_SERVICE_UNAVAILABLE',
          `فشل توليد الإجابة المؤصلة: ${err instanceof Error ? err.message : String(err)}`,
          503
        );
      }
    }

    throw new MishkatError('AI_SERVICE_UNAVAILABLE', 'انتهت محاولات توليد الإجابة', 503);
  }

  async validateGrounding(params: ValidateGroundingParams): Promise<GroundingValidationResult> {
    if (!this.apiKey) {
      return { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' };
    }

    if (params.answer.includes('لم أجد في المصادر المعتمدة المتاحة أدلة كافية')) {
      return { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' };
    }

    const evidenceSnippets = params.chunks
      .map((c) => `[${c.chunkId}] ${c.text}`)
      .join('\n\n');

    const promptText = `الإجابة المراد فحصها:
"${params.answer}"

الأدلة المعتمدة المتاحة:
${evidenceSnippets}

افحص الإجابة: هل جميع معلوماتها مستندة للأدلة المذكورة دون اختلاق أو معلومات خارجية؟`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_GROUNDING_PROMPT }],
      },
      generationConfig: {
        temperature: 0.0,
        responseMimeType: 'application/json',
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' };
      }

      const data = (await response.json()) as any;
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' };
      }

      const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(cleaned);

      return {
        isGrounded: Boolean(parsed.isGrounded),
        unsupportedClaims: Array.isArray(parsed.unsupportedClaims) ? parsed.unsupportedClaims : [],
        remedyAction: parsed.remedyAction === 'DOWNGRADE' ? 'DOWNGRADE' : 'ACCEPT',
      };
    } catch {
      return { isGrounded: true, unsupportedClaims: [], remedyAction: 'ACCEPT' };
    }
  }

  async generateFollowUps(params: GenerateFollowUpsParams): Promise<FollowUpQuestion[]> {
    if (!this.apiKey) {
      return [];
    }

    // Safety gate: never generate follow-ups for insufficient or empty answer
    if (
      !params.groundedAnswer ||
      params.groundedAnswer.includes('لم تتوفر في المستودع المعتمد مادة علمية موثقة كافية') ||
      !params.originalQuestion
    ) {
      return [];
    }

    const claimsText = (params.verifiedClaims || params.keyClaims || [])
      .map((c) => `- ${c}`)
      .join('\n');

    const excerptsText = (params.verifiedEvidenceExcerpts || [])
      .map((e) => `[${e.sourceName || 'مصدر معتمد'} — ${e.title || 'وثيقة'}]: "${e.content}"`)
      .join('\n\n');

    let promptText = `السؤال الأصلي: "${params.originalQuestion}"
الإجابة المؤصلة المعتمدة:
"""
${params.groundedAnswer}
"""
الموضوع: "${params.topic || params.category || 'مسألة إسلامية عامة'}"`;

    if (claimsText) {
      promptText += `\n\nالدعاوى المحققة المدعومة بالأدلة:\n${claimsText}`;
    }

    if (excerptsText) {
      promptText += `\n\nنصوص الأدلة المعتمدة المقبولة:\n${excerptsText}`;
    }

    promptText += `\n\nقم باقتراح ما بين 0 و 3 أسئلة تعليمية عربية موجزة ومحكمة لتعميق الفهم، مقيدة حصراً ومباشرة بالأدلة المحققة والإجابة المرفقة دون أي مقدمة أو فرضية غير مثبتة.`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_FOLLOWUPS_PROMPT }],
      },
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    };

    const maxAttempts = 2;
    const timeoutMs = Math.min(this.timeoutMs, 6000);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const response = await this.fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (attempt < maxAttempts) continue;
          return [];
        }

        const data = (await response.json()) as any;
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) return [];

        const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const parsed = JSON.parse(cleaned);

        const rawList = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.followUps)
          ? parsed.followUps
          : Array.isArray(parsed.questions)
          ? parsed.questions
          : [];

        const validTypes = ['دليل أعمق', 'مفهوم مرتبط', 'مقارنة', 'أثر المسألة', 'سؤال تحليلي'];

        const questions: FollowUpQuestion[] = rawList
          .map((item: any, idx: number) => {
            const qText = typeof item === 'string' ? item : item.question || item.text || '';
            const rawType = typeof item === 'object' ? item.type : undefined;
            const assignedType = validTypes.includes(rawType) ? rawType : 'مفهوم مرتبط';

            return {
              id: `fu_${params.parentInteractionId}_${idx + 1}`,
              question: qText.trim(),
              type: assignedType,
              origin: 'DEEP_LEARNING' as const,
              parentInteractionId: params.parentInteractionId,
            };
          })
          .filter((fu: FollowUpQuestion) => fu.question.length > 0);

        // Safe Patch 3 Rule 3 & 4: Validate each question against the verified context
        // Return 0 to 3 safe follow-up questions
        const verifiedContext = {
          originalQuestion: params.originalQuestion,
          groundedAnswer: params.groundedAnswer,
          verifiedClaims: params.verifiedClaims || params.keyClaims,
          evidenceExcerpts: params.verifiedEvidenceExcerpts,
        };

        const validatedQuestions = questions
          .filter((fu) => validateFollowUpQuestion(fu.question, verifiedContext))
          .slice(0, 3);

        return validatedQuestions;
      } catch {
        if (attempt < maxAttempts) continue;
        return [];
      }
    }

    return [];
  }

  async generateAssessment(params: GenerateAssessmentParams): Promise<AssessmentRecord> {
    if (!this.apiKey) {
      throw new MishkatError('AI_SERVICE_UNAVAILABLE', 'مفتاح Gemini API غير مهيأ لإنشاء التقييم', 503);
    }

    const eligibleList = params.eligibleInteractions || [];
    const validInteractionIds = new Set(eligibleList.map((i) => i.interactionId));

    if (eligibleList.length === 0) {
      throw new MishkatError('ASSESSMENT_NOT_ELIGIBLE', 'لا توجد مسائل محققة لإنشاء التقييم', 400);
    }

    const knowledgeSummary = eligibleList
      .slice(0, 20)
      .map(
        (item, idx) =>
          `[مسألة ${idx + 1}] المعرف: ${item.interactionId}
الموضوع: ${item.topic} (${item.category || 'عام'})
السؤال: "${item.question}"`
      )
      .join('\n\n---\n\n');

    const promptText = `المسائل المحققة في رحلة المستخدم (المصادر الحصرية للتقييم):
${knowledgeSummary}

قم بصياغة 5 أسئلة اختيار من متعدد باللغة العربية الفصيحة، مستندة حصراً إلى المسائل السابقة، مع ذكر معرف المسألة المرجعية في sourceInteractionIds.`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_ASSESSMENT_PROMPT }],
      },
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    const maxAttempts = 2;
    const timeoutMs = 30000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const response = await this.fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (attempt < maxAttempts) continue;
          throw new MishkatError('AI_SERVICE_UNAVAILABLE', `فشل إنشاء التقييم من Gemini: ${response.status}`, response.status);
        }

        const data = (await response.json()) as any;
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error('استجابة إنشاء التقييم فارغة');
        }

        const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const parsed = JSON.parse(cleaned);

        const rawQuestions = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.questions)
          ? parsed.questions
          : [];

        const validQuestions: AssessmentQuestionServer[] = [];

        for (let i = 0; i < rawQuestions.length; i++) {
          const q = rawQuestions[i];
          if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
            continue;
          }

          const rawCorrect =
            typeof q.correctOptionId === 'number'
              ? q.correctOptionId
              : typeof q.correctAnswer === 'number'
              ? q.correctAnswer
              : 0;
          const correctAnswer = Math.max(0, Math.min(3, rawCorrect));

          // Validate sourceInteractionIds: must only reference valid eligible interaction IDs
          const rawSourceIds = Array.isArray(q.sourceInteractionIds)
            ? q.sourceInteractionIds
            : Array.isArray(q.sourceRecordIds)
            ? q.sourceRecordIds
            : [];
          const filteredSourceIds = rawSourceIds.filter((id: string) => validInteractionIds.has(id));

          // If no valid source ID was provided, map to the corresponding interaction or first eligible
          const finalSourceIds =
            filteredSourceIds.length > 0
              ? filteredSourceIds
              : [eligibleList[i % eligibleList.length].interactionId];

          validQuestions.push({
            id: `q_${i + 1}`,
            questionId: `q_${i + 1}`,
            question: q.question.trim(),
            options: q.options.map((opt: any) => String(opt).trim()),
            correctOptionId: correctAnswer,
            correctAnswer,
            explanation: q.explanation || 'إجابة صحيحة وفق المعارف المحققة في رحلتك.',
            sourceInteractionIds: finalSourceIds,
            sourceRecordIds: finalSourceIds,
          });

          if (validQuestions.length >= 5) break;
        }

        if (validQuestions.length < 5) {
          throw new Error('لم يتمكن النموذج من صياغة 5 أسئلة صالحة مستندة للأدلة');
        }

        return {
          assessmentId: `ass_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sessionId: params.sessionId,
          basedOnRecordIds: Array.from(validInteractionIds),
          questions: validQuestions,
          status: 'READY',
          createdAt: new Date().toISOString(),
          totalQuestions: validQuestions.length,
        };
      } catch (err: unknown) {
        if (attempt < maxAttempts) continue;
        throw new MishkatError(
          'AI_SERVICE_UNAVAILABLE',
          `فشل إنشاء التقييم المعرفي: ${err instanceof Error ? err.message : String(err)}`,
          503
        );
      }
    }

    throw new MishkatError('AI_SERVICE_UNAVAILABLE', 'انتهت محاولات إنشاء التقييم', 503);
  }

  async generateReport(params: GenerateReportParams): Promise<FinalReportRecord> {
    const assessment = params.assessmentRecord;
    const totalQuestions = assessment.questions ? assessment.questions.length : (assessment.totalQuestions || 5);
    const assessmentScore = typeof assessment.score === 'number' ? assessment.score : 0;
    const correctCount = assessmentScore;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const eligibleInteractions = params.eligibleInteractions || [];
    const eligibleKnowledgeCount = eligibleInteractions.length;

    // 1. Topic Breakdown from Journey and Assessment
    const topicMap = new Map<string, { count: number; correct: number; total: number }>();
    for (const inter of eligibleInteractions) {
      const topic = inter.topic?.trim() || inter.understanding?.topic?.trim() || inter.category?.trim() || 'عام';
      const cur = topicMap.get(topic) || { count: 0, correct: 0, total: 0 };
      cur.count++;
      topicMap.set(topic, cur);
    }

    // Map each question to result, correctness, and source interaction ids
    const questionsDetail = (assessment.questions || []).map((q, idx) => {
      const qId = q.questionId || q.id || `q_${idx + 1}`;
      const subRes = assessment.submissionResults?.find((r) => r.questionId === qId);
      const isCorrect = subRes ? subRes.isCorrect : (idx < correctCount);
      const sourceIds = q.sourceRecordIds || q.sourceInteractionIds || [];

      // Attribute to topic
      for (const sid of sourceIds) {
        const found = eligibleInteractions.find((item) => item.interactionId === sid);
        if (found) {
          const t = found.topic?.trim() || found.understanding?.topic?.trim() || found.category?.trim() || 'عام';
          const entry = topicMap.get(t) || { count: 0, correct: 0, total: 0 };
          entry.total++;
          if (isCorrect) entry.correct++;
          topicMap.set(t, entry);
        }
      }

      return {
        questionId: qId,
        question: q.question,
        isCorrect,
        sourceInteractionIds: sourceIds,
      };
    });

    const topicPerformance: ReportTopicPerformance[] = Array.from(topicMap.entries()).map(
      ([topic, data]) => ({
        topic,
        interactionCount: data.count,
        correctCount: data.total > 0 ? data.correct : undefined,
        totalQuestions: data.total > 0 ? data.total : undefined,
      })
    );

    // 2. Deterministic Fallback Synthesis
    const getFallbackSynthesis = () => {
      const correctQs = questionsDetail.filter((q) => q.isCorrect);
      const incorrectQs = questionsDetail.filter((q) => !q.isCorrect);

      const strengths: ReportFeedbackArea[] =
        correctQs.length > 0
          ? correctQs.map((q) => ({
              area: `أظهرت نتائجك فهماً رصيناً لمسألة: ${q.question.replace(/؟/g, '')}`,
              assessmentQuestionIds: [q.questionId],
              sourceInteractionIds: q.sourceInteractionIds,
            }))
          : [
              {
                area: 'إتمام مسار البحث والتعلم في المسائل الشرعية المعتمدة',
                assessmentQuestionIds: [],
                sourceInteractionIds: [],
              },
            ];

      const reviewAreas: ReportFeedbackArea[] =
        incorrectQs.length > 0
          ? incorrectQs.map((q) => ({
              area: `مراجعة وتعميق الفهم في مسألة: ${q.question.replace(/؟/g, '')}`,
              assessmentQuestionIds: [q.questionId],
              sourceInteractionIds: q.sourceInteractionIds,
            }))
          : [
              {
                area: 'مواصلة الاستزادة وتثبيت الفهم في المسائل التخصصية المتقدمة',
                assessmentQuestionIds: [],
                sourceInteractionIds: [],
              },
            ];

      return {
        learningSummary: `أتممت بنجاح رحلتك المعرفية الموثقة في منصة مشكاة عبر استيعاب ${eligibleKnowledgeCount} مسألة معتمدة وإتمام التقييم المعرفي بنسبة إتقان ${percentage}%.`,
        strengths,
        reviewAreas,
        recommendations: [
          'مراجعة المسائل والمصادر المرجعية المسندة في رحلتك المعرفية لترسيخ الفهم.',
          'الانتقال إلى موضوعات تخصصية جديدة لتوسيع الحصيلة العلمية الموثقة.',
        ],
      };
    };

    let synthesis = getFallbackSynthesis();

    // 3. Optional AI Qualitative Synthesis (Gemini)
    if (this.apiKey) {
      const maxAttempts = 2;
      const timeoutMs = Math.min(this.timeoutMs, 6000);

      const promptText = `بيانات أداء المستخدم في الرحلة والتقييم:
إجمالي المسائل المحققة: ${eligibleKnowledgeCount}
نسبة إتقان التقييم: ${percentage}% (${correctCount} إجابات صحيحة من أصل ${totalQuestions})
الموضوعات المنجزة: ${topicPerformance.map((t) => t.topic).join('، ')}
الأسئلة والإسناد:
${questionsDetail
  .map(
    (q) =>
      `- المعرف: ${q.questionId} | السؤال: "${q.question}" | الإجابة: ${
        q.isCorrect ? 'صحيحة' : 'غير صحيحة'
      } | الإسناد: ${q.sourceInteractionIds.join(', ')}`
  )
  .join('\n')}

صغ التقرير التربوي وفق التعليمات الصارمة، دون استحداث أي معلومات أو شروح دينية خارجية.`;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
          const res = await this.fetchFn(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: promptText }] }],
              systemInstruction: { role: 'system', parts: [{ text: SYSTEM_REPORT_PROMPT }] },
              generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json',
              },
            }),
            signal: controller.signal,
          });

          clearTimeout(timer);

          if (!res.ok) {
            throw new Error(`Gemini status ${res.status}`);
          }

          const data = (await res.json()) as any;
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
            const parsed = JSON.parse(cleaned);

            if (parsed.learningSummary) {
              const parsedStrengths: ReportFeedbackArea[] = Array.isArray(parsed.strengths)
                ? parsed.strengths.map((s: any) => ({
                    area: typeof s === 'string' ? s : String(s.area || ''),
                    assessmentQuestionIds: Array.isArray(s.assessmentQuestionIds)
                      ? s.assessmentQuestionIds
                      : [],
                    sourceInteractionIds: Array.isArray(s.sourceInteractionIds)
                      ? s.sourceInteractionIds
                      : [],
                  }))
                : synthesis.strengths;

              const parsedReview: ReportFeedbackArea[] = Array.isArray(parsed.reviewAreas)
                ? parsed.reviewAreas.map((r: any) => ({
                    area: typeof r === 'string' ? r : String(r.area || ''),
                    assessmentQuestionIds: Array.isArray(r.assessmentQuestionIds)
                      ? r.assessmentQuestionIds
                      : [],
                    sourceInteractionIds: Array.isArray(r.sourceInteractionIds)
                      ? r.sourceInteractionIds
                      : [],
                  }))
                : synthesis.reviewAreas;

              const parsedRecs =
                Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
                  ? parsed.recommendations.map(String)
                  : synthesis.recommendations;

              synthesis = {
                learningSummary: String(parsed.learningSummary),
                strengths: parsedStrengths.length > 0 ? parsedStrengths : synthesis.strengths,
                reviewAreas: parsedReview.length > 0 ? parsedReview : synthesis.reviewAreas,
                recommendations: parsedRecs,
              };
              break;
            }
          }
        } catch {
          if (attempt < maxAttempts) continue;
          // Fallback is already initialized
        }
      }
    }

    // 4. Sources extraction
    const sourceMap = new Map<string, { sourceId: string; sourceName: string; category: string }>();
    for (const inter of eligibleInteractions) {
      if (inter.citations) {
        for (const cit of inter.citations) {
          if (cit.sourceId && !sourceMap.has(cit.sourceId)) {
            sourceMap.set(cit.sourceId, {
              sourceId: cit.sourceId,
              sourceName: cit.sourceName || cit.sourceId,
              category: inter.category || inter.understanding?.category || 'عام',
            });
          }
        }
      }
    }

    const domainBreakdown: Record<string, number> = {};
    for (const tp of topicPerformance) {
      domainBreakdown[tp.topic] = tp.interactionCount;
    }

    const userCount = eligibleInteractions.filter((i) => i.origin === 'USER').length;
    const deepCount = eligibleInteractions.filter((i) => i.origin === 'DEEP_LEARNING').length;
    const reportId =
      params.reportId || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      reportId,
      sessionId: params.sessionId,
      assessmentId: assessment.assessmentId,
      generatedAt: new Date().toISOString(),
      summary: {
        eligibleKnowledgeCount,
        assessmentScore,
        correctCount,
        totalQuestions,
        percentage,
      },
      topicPerformance,
      strengths: synthesis.strengths,
      reviewAreas: synthesis.reviewAreas,
      learningSummary: synthesis.learningSummary,
      recommendations: synthesis.recommendations,
      journeySummary: {
        totalQuestions: eligibleKnowledgeCount,
        verifiedConceptsCount: eligibleKnowledgeCount,
        domainBreakdown,
        originBreakdown: {
          user: userCount,
          deepLearning: deepCount,
        },
        narrative: synthesis.learningSummary,
      },
      comprehensionAssessment: {
        scorePercentage: percentage,
        correctCount,
        totalQuestions,
        strengths: synthesis.strengths.map((s) => s.area),
        growthAreas: synthesis.reviewAreas.map((r) => r.area),
        narrative: `أظهر التقييم استيعاباً رصيناً لـ ${correctCount} من أصل ${totalQuestions} مسألة بنسبة ${percentage}%.`,
      },
      referencedSources: Array.from(sourceMap.values()),
    };
  }
}

// Global provider management
let currentAIProvider: AIProvider = new GeminiAIProvider();

export function getAIProvider(): AIProvider {
  return currentAIProvider;
}

export function setAIProvider(provider: AIProvider): void {
  currentAIProvider = provider;
}
