import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';

async function checkRetB() {
  const retriever = new HybridRetriever();
  const claimB = 'القرآن الكريم وحي منزل من الله تعالى على النبي محمد صلى الله عليه وسلم';
  const res = await retriever.retrieve({
    question: 'هل القرآن من تأليف محمد ﷺ؟',
    claims: [claimB],
  }, { topK: 5 });

  console.log('Top 5 candidates for Claim B:');
  for (const c of res.claimResults[0].candidates) {
    console.log(`  [${c.chunkId}] (combined=${c.combinedScore}) ${c.title}`);
  }
}

checkRetB();
