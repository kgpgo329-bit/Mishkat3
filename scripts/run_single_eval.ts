import dotenv from 'dotenv';
dotenv.config();

import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { EvidenceVerificationService } from '../src/server/verification/evidenceVerificationService.js';
import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

const aiProvider = getAIProvider();
const retriever = new HybridRetriever();
const verifier = new EvidenceVerificationService(aiProvider);

export async function evalQuestion(id: string, question: string) {
  console.log(`\n========================================`);
  console.log(`Evaluating Question ${id}: "${question}"`);

  const understanding = await aiProvider.understandQuestion({ question });
  console.log(`Claims (${understanding.claims.length}):`, understanding.claims);

  // Sleep 4s
  await new Promise((r) => setTimeout(r, 4000));

  const retrieval = await retriever.retrieve({
    question,
    normalizedQuestion: understanding.normalizedQuestion,
    claims: understanding.claims,
  }, { topK: 3 });

  const verification = await verifier.verifyClaims({
    claimResults: retrieval.claimResults,
    maxCandidatesPerClaim: 2,
  });

  let supported = 0;
  let partial = 0;
  let unsupported = 0;
  let failed = 0;

  for (const ev of verification.verifiedEvidence) {
    if (ev.verificationStatus === 'SUPPORTED') supported++;
    else if (ev.verificationStatus === 'PARTIAL') partial++;
    else if (ev.verificationStatus === 'UNSUPPORTED') unsupported++;
    else if (ev.verificationStatus === 'VERIFICATION_FAILED') failed++;
  }

  console.log(`\nResult for ${id}:`);
  console.log(`CLAIMS: ${understanding.claims.length}`);
  console.log(`SUPPORTED: ${supported}`);
  console.log(`PARTIAL: ${partial}`);
  console.log(`UNSUPPORTED: ${unsupported}`);
  console.log(`FAILED: ${failed}`);
  console.log(`SUFFICIENCY: ${verification.sufficiency.sufficiencyState}`);

  return {
    id,
    claims: understanding.claims.length,
    supported,
    partial,
    unsupported,
    failed,
    sufficiency: verification.sufficiency.sufficiencyState,
  };
}

async function main() {
  const qId = process.argv[2] || 'A';
  const questions: Record<string, string> = {
    A: 'لماذا يعبد المسلمون الكعبة؟',
    B: 'هل القرآن من تأليف محمد ﷺ؟',
    C: 'هل الإسلام انتشر بالسيف؟',
    D: 'لماذا توجد أحكام مختلفة بين العلماء؟',
    E: 'ما معنى التوحيد؟',
    F: 'ما تفسير سورة الإخلاص؟',
  };

  const question = questions[qId];
  if (!question) {
    console.error(`Invalid question id ${qId}`);
    process.exit(1);
  }

  await evalQuestion(qId, question);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
