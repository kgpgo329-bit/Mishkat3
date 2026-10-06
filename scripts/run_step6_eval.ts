import dotenv from 'dotenv';
dotenv.config();

import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { EvidenceVerificationService } from '../src/server/verification/evidenceVerificationService.js';
import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

interface EvalReport {
  id: string;
  question: string;
  claimsCount: number;
  supportedCount: number;
  partialCount: number;
  unsupportedCount: number;
  failedCount: number;
  sufficiency: string;
}

const QUESTIONS = [
  { id: 'A', question: 'لماذا يعبد المسلمون الكعبة؟' },
  { id: 'B', question: 'هل القرآن من تأليف محمد ﷺ؟' },
  { id: 'C', question: 'هل الإسلام انتشر بالسيف؟' },
  { id: 'D', question: 'لماذا توجد أحكام مختلفة بين العلماء؟' },
  { id: 'E', question: 'ما معنى التوحيد؟' },
  { id: 'F', question: 'ما تفسير سورة الإخلاص؟' },
];

async function run() {
  const aiProvider = getAIProvider();
  const retriever = new HybridRetriever();
  const verifier = new EvidenceVerificationService(aiProvider);

  const reports: EvalReport[] = [];

  for (const item of QUESTIONS) {
    console.log(`\nEvaluating [${item.id}]: "${item.question}"...`);

    const understanding = await aiProvider.understandQuestion({ question: item.question });
    console.log(`  Understood ${understanding.claims.length} claims:`, understanding.claims);

    // Pause 2.5s for rate limits
    await new Promise((r) => setTimeout(r, 2500));

    const retrieval = await retriever.retrieve({
      question: item.question,
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

    const report: EvalReport = {
      id: item.id,
      question: item.question,
      claimsCount: understanding.claims.length,
      supportedCount: supported,
      partialCount: partial,
      unsupportedCount: unsupported,
      failedCount: failed,
      sufficiency: verification.sufficiency.sufficiencyState,
    };

    reports.push(report);
    console.log(`  -> Finished [${item.id}]: Sufficiency=${report.sufficiency} (Supported=${supported}, Partial=${partial}, Unsupported=${unsupported}, Failed=${failed})`);

    // Pause 3s before next question
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log('\n================ FINAL RESULTS ================');
  for (const r of reports) {
    console.log(`\n${r.id}:`);
    console.log(`CLAIMS: ${r.claimsCount}`);
    console.log(`SUPPORTED: ${r.supportedCount}`);
    console.log(`PARTIAL: ${r.partialCount}`);
    console.log(`UNSUPPORTED: ${r.unsupportedCount}`);
    console.log(`FAILED: ${r.failedCount}`);
    console.log(`SUFFICIENCY: ${r.sufficiency}`);
  }
}

run().catch((e) => {
  console.error('Run failed:', e);
  process.exit(1);
});
