import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

async function testResponseStructure() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'أرجع JSON: {"status": "ok"}' }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  const data = await res.json() as any;
  console.log('Full data:', JSON.stringify(data, null, 2));
}

testResponseStructure();
