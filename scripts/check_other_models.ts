import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;

const candidateModels = [
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemma-4-26b-a4b-it',
  'gemma-4-31b-it',
  'gemini-pro-latest',
  'gemini-2.5-pro',
  'gemini-3.1-pro-preview',
];

async function checkOtherModels() {
  for (const m of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'قل كلمة: تم' }] }],
        }),
      });
      console.log(m, 'Status:', res.status);
      if (res.ok) {
        const d = await res.json() as any;
        console.log('  -> WORKING! Response:', d.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      } else {
        const err = await res.json() as any;
        console.log('  -> Error:', err.error?.message?.substring(0, 100));
      }
    } catch (e: any) {
      console.log(m, 'ERR:', e.message);
    }
  }
}

checkOtherModels();
