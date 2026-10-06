import dotenv from 'dotenv';
dotenv.config();

import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';
import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

async function test1909() {
  const repo = new LocalJsonKnowledgeRepository();
  const chunk = await repo.getChunkById('chk_doc_islamic_content_term_1909_3');
  console.log('Chunk title:', chunk?.title);
  console.log('Chunk snippet:', chunk?.text.substring(0, 200));

  const provider = getAIProvider();
  const res = await provider.verifyEvidence({
    claim: 'القرآن الكريم وحي منزل من الله تعالى على النبي محمد صلى الله عليه وسلم',
    candidateChunk: chunk!,
  });
  console.log('Verification result:', res);
}

test1909();
