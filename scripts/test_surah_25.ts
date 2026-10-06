import dotenv from 'dotenv';
dotenv.config();

import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';
import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

async function testSurah25() {
  const repo = new LocalJsonKnowledgeRepository();
  const chunk = await repo.getChunkById('chk_doc_quranpedia_surah_25_1');
  console.log('Chunk text:', chunk?.text);

  const provider = getAIProvider();
  const res = await provider.verifyEvidence({
    claim: 'القرآن الكريم وحي منزل من الله تعالى على النبي محمد صلى الله عليه وسلم',
    candidateChunk: chunk!,
  });
  console.log('Verification result:', res);
}

testSurah25();
