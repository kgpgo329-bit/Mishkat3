import dotenv from 'dotenv';
dotenv.config();

import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

async function checkUnderstanding() {
  const provider = getAIProvider();
  const uA = await provider.understandQuestion({ question: 'لماذا يعبد المسلمون الكعبة؟' });
  console.log('Question A Understanding:');
  console.log('  claims:', uA.claims);
}

checkUnderstanding();
