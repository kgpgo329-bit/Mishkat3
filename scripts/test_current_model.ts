import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

async function testCurrentModel() {
  const start = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'أجب بكلمة واحدة: نعم أم لا؟' }] }],
    }),
  });
  console.log(model, 'Status:', res.status, 'Time:', Date.now() - start, 'ms');
  if (res.ok) {
    const data = await res.json() as any;
    console.log('Response text:', data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
  }
}

testCurrentModel();
