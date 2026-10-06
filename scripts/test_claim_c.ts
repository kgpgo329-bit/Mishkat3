import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';

async function testClaimRetrieval() {
  const retriever = new HybridRetriever();
  const qC = 'هل الإسلام انتشر بالسيف؟';
  const claimsC = [
    'الإسلام انتشر بالحجة والبيان وحرية الاعتقاد ولا إكراه في الدين',
    'القتال والجهاد شُرع للدفاع ورد العدوان وتأمين حرية الدعوة وليس للإكراه',
  ];

  const res = await retriever.retrieve({ question: qC, claims: claimsC }, { topK: 5 });
  console.log('=== CLAIM 1 RESULTS ===');
  console.log('Claim:', res.claimResults[0].claim);
  res.claimResults[0].candidates.slice(0, 3).forEach((c, idx) => {
    console.log(`  #${idx + 1} [${c.chunkId}] ${c.title} (combined=${c.combinedScore})`);
    console.log(`     Snippet: ${c.content.substring(0, 150).replace(/\n/g, ' ')}...`);
  });

  console.log('\n=== CLAIM 2 RESULTS ===');
  console.log('Claim:', res.claimResults[1].claim);
  res.claimResults[1].candidates.slice(0, 3).forEach((c, idx) => {
    console.log(`  #${idx + 1} [${c.chunkId}] ${c.title} (combined=${c.combinedScore})`);
    console.log(`     Snippet: ${c.content.substring(0, 150).replace(/\n/g, ' ')}...`);
  });
}

testClaimRetrieval();
