import dotenv from 'dotenv';
dotenv.config();

import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { EvidenceVerificationService } from '../src/server/verification/evidenceVerificationService.js';
import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

const aiProvider = getAIProvider();
const retriever = new HybridRetriever();
const verifier = new EvidenceVerificationService(aiProvider);

const QUESTIONS = [
  { id: 'A', question: 'لماذا يعبد المسلمون الكعبة؟' },
  { id: 'B', question: 'هل القرآن من تأليف محمد ﷺ؟' },
  { id: 'C', question: 'هل الإسلام انتشر بالسيف؟' },
  { id: 'D', question: 'لماذا توجد أحكام مختلفة بين العلماء؟' },
  { id: 'E', question: 'ما معنى التوحيد؟' },
  { id: 'F', question: 'ما تفسير سورة الإخلاص؟' },
];

async function diagnose() {
  const targetId = process.argv[2];
  const list = targetId ? QUESTIONS.filter((q) => q.id === targetId) : QUESTIONS;

  for (const item of list) {
    console.log(`\n============================================================`);
    console.log(`DIAGNOSIS FOR QUESTION ${item.id}: "${item.question}"`);
    console.log(`============================================================`);

    const understanding = await aiProvider.understandQuestion({ question: item.question });
    console.log(`Claims (${understanding.claims.length}):`);
    understanding.claims.forEach((c, i) => console.log(`  Claim ${i + 1}: "${c}"`));

    // Pause 3s
    await new Promise((r) => setTimeout(r, 3000));

    const retrieval = await retriever.retrieve({
      question: item.question,
      normalizedQuestion: understanding.normalizedQuestion,
      claims: understanding.claims,
    }, { topK: 3 });

    for (let i = 0; i < retrieval.claimResults.length; i++) {
      const cr = retrieval.claimResults[i];
      console.log(`\n--- Claim ${i + 1}: "${cr.claim}" ---`);
      for (const cand of cr.candidates.slice(0, 2)) {
        console.log(`  [Candidate] ${cand.chunkId} | ${cand.title} | CombinedScore=${cand.combinedScore.toFixed(3)} (Lex=${cand.lexicalScore.toFixed(3)}, Sem=${cand.semanticScore?.toFixed(3) ?? 'N/A'})`);
        console.log(`  Excerpt: "${cand.content.slice(0, 160).replace(/\n/g, ' ')}..."`);

        const vResult = await verifier.verifySingleClaimEvidence(cr.claim, cand, cr.claimId);
        console.log(`  -> Verifier Status: ${vResult.verificationStatus} (Confidence: ${vResult.confidence})`);
        console.log(`  -> Verifier Reason: "${vResult.relation}"`);

        // Sleep 1.5s between candidate verifications
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
}

diagnose().catch(console.error);
