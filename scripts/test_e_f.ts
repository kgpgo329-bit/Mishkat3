import dotenv from 'dotenv';
dotenv.config();

import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { EvidenceVerificationService } from '../src/server/verification/evidenceVerificationService.js';
import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

async function testQuestions() {
  const aiProvider = getAIProvider();
  const retriever = new HybridRetriever();
  const verifier = new EvidenceVerificationService(aiProvider);

  for (const q of ['ما معنى التوحيد؟', 'ما تفسير سورة الإخلاص؟']) {
    console.log(`\n========================================`);
    console.log(`Question: "${q}"`);

    const understanding = await aiProvider.understandQuestion({ question: q });
    console.log('Claims:', understanding.claims);

    const retrieval = await retriever.retrieve({
      question: q,
      claims: understanding.claims,
    }, { topK: 3 });

    const verification = await verifier.verifyClaims({
      claimResults: retrieval.claimResults,
      maxCandidatesPerClaim: 1, // Test top 1 candidate
    });

    console.log('Sufficiency State:', verification.sufficiency.sufficiencyState);
    console.log('Verified Evidences:');
    for (const ev of verification.verifiedEvidence) {
      console.log(`  [${ev.chunkId}] status=${ev.verificationStatus} confidence=${ev.confidence}`);
      console.log(`  relation: ${ev.relation}`);
    }

    // Sleep 3s to respect RPM
    await new Promise((r) => setTimeout(r, 3000));
  }
}

testQuestions();
