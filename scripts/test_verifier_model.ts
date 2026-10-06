import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;

async function testModel(modelName: string) {
  const start = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'أجب بكلمة واحدة: نعم أم لا؟' }] }],
    }),
  });
  console.log(modelName, 'Status:', res.status, 'Time:', Date.now() - start, 'ms');
}

async function main() {
  await testModel('gemini-1.5-flash');
  await testModel('gemini-1.5-pro');
}

main();
