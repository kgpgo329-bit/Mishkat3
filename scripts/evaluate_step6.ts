import dotenv from 'dotenv';
dotenv.config();

import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { EvidenceVerificationService } from '../src/server/verification/evidenceVerificationService.js';
import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

interface ChallengeEvaluation {
  id: string;
  question: string;
  claimsCount: number;
  supportedCount: number;
  partialCount: number;
  unsupportedCount: number;
  failedCount: number;
  sufficiencyState: string;
  details: any;
}

const CHALLENGE_QUESTIONS = [
  { id: 'A', question: 'لماذا يعبد المسلمون الكعبة؟' },
  { id: 'B', question: 'هل القرآن من تأليف محمد ﷺ؟' },
  { id: 'C', question: 'هل الإسلام انتشر بالسيف؟' },
  { id: 'D', question: 'لماذا توجد أحكام مختلفة بين العلماء؟' },
  { id: 'E', question: 'ما معنى التوحيد؟' },
  { id: 'F', question: 'ما تفسير سورة الإخلاص؟' },
];

async function evaluateStep6() {
  console.log('=== STEP 6 EVALUATION ON 6 MVP QUESTIONS ===\n');

  const aiProvider = getAIProvider();
  const retriever = new HybridRetriever();
  const verifier = new EvidenceVerificationService(aiProvider);

  const results: Record<string, ChallengeEvaluation> = {};

  for (const q of CHALLENGE_QUESTIONS) {
    console.log(`Evaluating Question ${q.id}: "${q.question}"...`);

    // 1. Understand Question
    const understanding = await aiProvider.understandQuestion({
      question: q.question,
    });

    // 2. Hybrid Retrieval
    const retrieval = await retriever.retrieve({
      question: q.question,
      normalizedQuestion: understanding.normalizedQuestion,
      claims: understanding.claims,
    }, { topK: 3 });

    // 3. Evidence Verification + Sufficiency
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

    results[q.id] = {
      id: q.id,
      question: q.question,
      claimsCount: understanding.claims.length,
      supportedCount: supported,
      partialCount: partial,
      unsupportedCount: unsupported,
      failedCount: failed,
      sufficiencyState: verification.sufficiency.sufficiencyState,
      details: {
        claims: understanding.claims,
        sufficiency: verification.sufficiency,
        evidence: verification.verifiedEvidence,
      },
    };

    console.log(`[Result ${q.id}] Claims: ${understanding.claims.length} | Supported: ${supported} | Partial: ${partial} | Unsupported: ${unsupported} | Failed: ${failed} | Sufficiency: ${verification.sufficiency.sufficiencyState}\n`);
  }

  console.log('=== SUMMARY FOR REPORT ===');
  for (const id of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const r = results[id];
    console.log(`\n${id}:`);
    console.log(`CLAIMS: ${r.claimsCount}`);
    console.log(`SUPPORTED: ${r.supportedCount}`);
    console.log(`PARTIAL: ${r.partialCount}`);
    console.log(`UNSUPPORTED: ${r.unsupportedCount}`);
    console.log(`FAILED: ${r.failedCount}`);
    console.log(`SUFFICIENCY: ${r.sufficiencyState}`);
  }
}

evaluateStep6().catch((err) => {
  console.error('Step 6 evaluation failed:', err);
  process.exit(1);
});
