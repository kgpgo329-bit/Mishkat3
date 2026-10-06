import dotenv from 'dotenv';
dotenv.config();

import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';

const CHALLENGE_QUESTIONS = [
  {
    id: 'A',
    question: 'لماذا يعبد المسلمون الكعبة؟',
    claims: [
      'المسلمون لا يعبدون الكعبة وإنما يعبدون الله وحده',
      'الكعبة قبلة للصلاة ورمز للتوحيد وليست معبوداً',
    ],
  },
  {
    id: 'B',
    question: 'هل القرآن من تأليف محمد ﷺ؟',
    claims: [
      'القرآن كلام الله المعجز المنزل على محمد ﷺ وليس من تأليفه',
      'إعجاز القرآن وبلاغته دليل على مصدره الإلهي',
    ],
  },
  {
    id: 'C',
    question: 'هل الإسلام انتشر بالسيف؟',
    claims: [
      'الإسلام انتشر بالحجة والبيان وحرية الاعتقاد',
      'القتال في الإسلام للدفاع ورد العدوان وليس لإكراه الناس',
    ],
  },
  {
    id: 'D',
    question: 'لماذا توجد أحكام مختلفة بين العلماء؟',
    claims: [
      'اختلاف العلماء في الفروع ناشئ عن أدلة وقواعد الاجتهاد وفهم النصوص',
      'الاختلاف الفقهي رحمة وسعة ولا يقدح في أصول الشريعة',
    ],
  },
  {
    id: 'E',
    question: 'ما معنى التوحيد؟',
    claims: [
      'التوحيد هو إفراد الله بالربوبية والألوهية والأسماء والصفات',
      'التوحيد هو أصل الدين ورسالته الكبرى',
    ],
  },
  {
    id: 'F',
    question: 'ما تفسير سورة الإخلاص؟',
    claims: [
      'سورة الإخلاص تصف كمال الله وتفرده بالصمدية والأحدية',
      'سورة الإخلاص تعدل ثلث القرآن لتركيزها على التوحيد الخالص',
    ],
  },
];

async function runEvaluation() {
  const retriever = new HybridRetriever();

  console.log('=== EVALUATION OF STEP 5 HYBRID RETRIEVAL ON 6 MVP QUESTIONS ===\n');

  for (const q of CHALLENGE_QUESTIONS) {
    console.log(`------------------------------------------------------------`);
    console.log(`[Challenge ${q.id}] Question: "${q.question}"`);
    console.log(`Claims: ${JSON.stringify(q.claims)}`);

    const result = await retriever.retrieve(
      {
        question: q.question,
        claims: q.claims,
      },
      { topK: 5 }
    );

    console.log(`Retrieval Mode: ${result.retrievalMode}`);
    console.log(`Top 3 Candidates for overall question:`);

    const top3 = result.allCandidates.slice(0, 3);
    top3.forEach((c, idx) => {
      console.log(`  #${idx + 1} Chunk ID: ${c.chunkId}`);
      console.log(`     Title: ${c.title}`);
      console.log(`     Source: ${c.sourceName} (${c.sourceId})`);
      console.log(`     Scores: combined=${c.combinedScore}, lexical=${c.lexicalScore}, semantic=${c.semanticScore}`);
      console.log(`     Snippet: ${c.content.substring(0, 120).replace(/\n/g, ' ')}...`);
    });

    console.log(`Top chunk for each claim:`);
    result.claimResults.forEach((cr) => {
      const topClaimChunk = cr.candidates[0];
      if (topClaimChunk) {
        console.log(`  Claim "${cr.claim.substring(0, 40)}..." -> Top Chunk: ${topClaimChunk.chunkId} ("${topClaimChunk.title}", combined=${topClaimChunk.combinedScore})`);
      }
    });
  }
}

runEvaluation().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
