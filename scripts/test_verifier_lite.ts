import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
const model = 'gemini-flash-lite-latest';

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
5. أرجع فقط كائن JSON مطابق تماماً للهيكل التالي:
{
  "verificationStatus": "SUPPORTED" | "PARTIAL" | "UNSUPPORTED",
  "confidence": number,
  "relation": string
}`;

async function testVerification(claim: string, chunkTitle: string, chunkText: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const prompt = `الدعوى الذرية المراد التحقق منها:
"${claim}"

عنوان المصدر: "${chunkTitle}"
النص المصدري:
"""
${chunkText}
"""`;

  const start = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: SYSTEM_VERIFICATION_PROMPT }] },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.0,
      },
    }),
  });

  const time = Date.now() - start;
  const data = await res.json() as any;
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log(`\nClaim: "${claim}"`);
  console.log(`Chunk: "${chunkTitle}" (${time}ms, status: ${res.status})`);
  console.log('Result:', raw);
}

async function main() {
  await testVerification(
    'الكعبة قبلة للصلاة وليست معبوداً للمسلمين',
    'الجمهرة — الكعبة المشرفة وتوحيد التعبد لرب البيت',
    'الكعبة المشرفة هي قبلة المسلمين التي يتوجهون إليها في صلاتهم بأمر الله، والعبادة إنما هي لله وحده رب البيت، ولا يعبد المسلمون الأحجار ولا البناء.'
  );

  await testVerification(
    'الإسلام انتشر بالقوة والسيف وإكراه الناس',
    'الجمهرة — الغزوات والسرايا والبعوث ومقاصد مشروعية القتال للدفاع',
    'القتال في الإسلام شُرع للدفاع ورد العدوان وتأمين حرية الدعوة، ولم يكن قط لإكراه الناس على الدخول في الدين لقوله تعالى لا إكراه في الدين.'
  );

  await testVerification(
    'القرآن كلام الله المعجز المنزل على محمد ﷺ',
    'الجمهرة — أحكام التجارة والبيع',
    'البيع مباح في الشريعة الإسلامية بشروطه وأركانه.'
  );
}

main();
