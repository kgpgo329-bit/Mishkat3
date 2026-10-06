import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  const res = await fetch(url);
  const data = await res.json() as any;
  console.log('Models count:', data.models?.length);
  const supported = (data.models || []).map((m: any) => ({
    name: m.name,
    supportedGenerationMethods: m.supportedGenerationMethods,
  }));
  console.log('Supported models:');
  for (const m of supported) {
    if (m.supportedGenerationMethods.includes('generateContent')) {
      console.log('  ', m.name);
    }
  }
}

listModels();
