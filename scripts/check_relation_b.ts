import dotenv from 'dotenv';
dotenv.config();

import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

async function checkRelations() {
  const provider = getAIProvider();
  const retriever = new HybridRetriever();

  // Test B claim 2: القرآن الكريم وحي منزل من الله تعالى على النبي محمد صلى الله عليه وسلم
  const claimB = 'القرآن الكريم وحي منزل من الله تعالى على النبي محمد صلى الله عليه وسلم';
  const retB = await retriever.retrieve({ question: 'هل القرآن من تأليف محمد ﷺ؟', claims: [claimB] }, { topK: 3 });

  console.log(`\n=== RETRIEVAL FOR CLAIM B ===`);
  for (const c of retB.claimResults[0].candidates.slice(0, 2)) {
    console.log(`Candidate [${c.chunkId}] ${c.title}`);
    console.log(`Snippet: ${c.content.substring(0, 150).replace(/\n/g, ' ')}...`);

    const res = await provider.verifyEvidence({
      claim: claimB,
      candidateChunk: {
        chunkId: c.chunkId,
        documentId: c.documentId,
        sourceId: c.sourceId,
        title: c.title,
        text: c.content,
        category: c.category,
        contentHash: c.contentHash,
      },
    });
    console.log(`Verification: status=${res.verificationStatus}, confidence=${res.confidence}`);
    console.log(`Relation: ${res.relation}`);
  }
}

checkRelations();
