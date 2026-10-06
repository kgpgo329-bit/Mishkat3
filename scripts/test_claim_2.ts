import dotenv from 'dotenv';
dotenv.config();

import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

async function testClaim2() {
  const retriever = new HybridRetriever();
  const provider = getAIProvider();

  const claim2 = 'الكعبة هي قبلة المسلمين ووجهتهم في الصلاة فقط';
  const retrieval = await retriever.retrieve({
    question: 'لماذا يعبد المسلمون الكعبة؟',
    claims: [claim2],
  }, { topK: 3 });

  console.log('Top candidate for claim 2:');
  const top = retrieval.claimResults[0]?.candidates[0];
  if (top) {
    console.log('Chunk:', top.chunkId, top.title);
    console.log('Snippet:', top.content.substring(0, 200));

    const res = await provider.verifyEvidence({
      claim: claim2,
      candidateChunk: {
        chunkId: top.chunkId,
        documentId: top.documentId,
        sourceId: top.sourceId,
        title: top.title,
        text: top.content,
        category: top.category,
        contentHash: top.contentHash,
      },
    });
    console.log('Verification result:', res);
  }
}

testClaim2();
