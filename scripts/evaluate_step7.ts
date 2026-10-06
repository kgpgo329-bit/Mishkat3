import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { EvidenceVerificationService } from '../src/server/verification/evidenceVerificationService.js';
import { GroundedAnswerService } from '../src/server/answer/groundedAnswerService.js';
import { getAIProvider } from '../src/server/ai/GeminiAIProvider.js';

interface ChallengeEvaluationStep7 {
  id: string;
  question: string;
  sufficiencyState: string;
  answerBehavior: string;
  citationsCount: number;
  citedChunks: string[];
  groundingStatus: string;
  answerSnippet: string;
}

const CHALLENGE_QUESTIONS = [
  { id: 'A', question: 'لماذا يعبد المسلمون الكعبة؟' },
  { id: 'B', question: 'هل القرآن من تأليف محمد ﷺ؟' },
  { id: 'C', question: 'هل الإسلام انتشر بالسيف؟' },
  { id: 'D', question: 'لماذا توجد أحكام مختلفة بين العلماء؟' },
  { id: 'E', question: 'ما معنى التوحيد؟' },
  { id: 'F', question: 'ما تفسير سورة الإخلاص؟' },
];

const cacheFile = path.resolve(process.cwd(), 'data', 'step7_eval_cache.json');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryOn429<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if ((err?.statusCode === 429 || err?.message?.includes('429') || err?.code === 'AI_QUOTA_EXHAUSTED') && attempt < maxRetries) {
        console.log(`[Rate limit 429] Waiting 22s before retry (attempt ${attempt}/${maxRetries})...`);
        await sleep(22000);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

async function evaluateStep7() {
  console.log('=== STEP 7 EVALUATION ON 6 MVP QUESTIONS ===\n');

  let results: Record<string, ChallengeEvaluationStep7> = {};
  if (fs.existsSync(cacheFile)) {
    try {
      results = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    } catch {}
  }

  const aiProvider = getAIProvider();
  const retriever = new HybridRetriever();
  const verifier = new EvidenceVerificationService(aiProvider);
  const answerService = new GroundedAnswerService(aiProvider);

  for (const q of CHALLENGE_QUESTIONS) {
    if (results[q.id]) {
      console.log(`Skipping already evaluated Question ${q.id} ("${q.question}")...`);
      continue;
    }

    console.log(`Evaluating Question ${q.id}: "${q.question}"...`);

    // 1. Understand Question
    const understanding = await retryOn429(() =>
      aiProvider.understandQuestion({
        question: q.question,
      })
    );
    await sleep(4000);

    let status = 'NOT_IMPLEMENTED';
    let answerBehavior = 'UNKNOWN';

    if (understanding.isPersonalFatwa) {
      status = 'PERSONAL_FATWA';
      answerBehavior = 'FATWA_REFERRED';
      results[q.id] = {
        id: q.id,
        question: q.question,
        sufficiencyState: 'N/A',
        answerBehavior,
        citationsCount: 0,
        citedChunks: [],
        groundingStatus: 'N/A',
        answerSnippet: 'None (specialist referral)',
      };
      fs.writeFileSync(cacheFile, JSON.stringify(results, null, 2), 'utf-8');
      console.log(`[Result ${q.id}] Gate: PERSONAL_FATWA\n`);
      continue;
    }

    if (understanding.needsClarification) {
      status = 'NEEDS_CLARIFICATION';
      answerBehavior = 'CLARIFICATION_REQUESTED';
      results[q.id] = {
        id: q.id,
        question: q.question,
        sufficiencyState: 'N/A',
        answerBehavior,
        citationsCount: 0,
        citedChunks: [],
        groundingStatus: 'N/A',
        answerSnippet: understanding.clarificationReason || 'Clarification requested',
      };
      fs.writeFileSync(cacheFile, JSON.stringify(results, null, 2), 'utf-8');
      console.log(`[Result ${q.id}] Gate: NEEDS_CLARIFICATION\n`);
      continue;
    }

    // 2. Hybrid Retrieval
    const retrieval = await retriever.retrieve(
      {
        question: q.question,
        normalizedQuestion: understanding.normalizedQuestion,
        claims: understanding.claims,
      },
      { topK: 3 }
    );

    // 3. Evidence Verification
    const verification = await retryOn429(() =>
      verifier.verifyClaims({
        claimResults: retrieval.claimResults,
        maxCandidatesPerClaim: 2,
      })
    );
    await sleep(4000);

    const sufficiency = verification.sufficiency;
    if (sufficiency.sufficiencyState === 'SUFFICIENT') {
      status = 'SUFFICIENT';
    } else if (sufficiency.sufficiencyState === 'PARTIAL') {
      status = 'PARTIAL';
    } else {
      status = 'INSUFFICIENT';
    }

    // 4. Grounded Answer Generation
    const answerResult = await retryOn429(() =>
      answerService.generateAnswer({
        question: q.question,
        sufficiency,
        verifiedEvidence: verification.verifiedEvidence,
        candidates: retrieval.allCandidates,
        status: status as any,
        understanding,
      })
    );
    await sleep(4000);

    if (sufficiency.sufficiencyState === 'INSUFFICIENT') {
      answerBehavior = 'ABSTAINED';
    } else if (sufficiency.sufficiencyState === 'PARTIAL') {
      answerBehavior = 'PARTIAL_WITH_NOTICE';
    } else if (answerResult.status === 'ANSWERED') {
      answerBehavior = 'ANSWERED';
    } else {
      answerBehavior = answerResult.status;
    }

    const groundingStatus = answerResult.grounding
      ? answerResult.grounding.isGrounded
        ? 'GROUNDED'
        : 'UNGROUNDED_DOWNGRADED'
      : 'N/A';

    results[q.id] = {
      id: q.id,
      question: q.question,
      sufficiencyState: sufficiency.sufficiencyState,
      answerBehavior,
      citationsCount: answerResult.citations.length,
      citedChunks: answerResult.citations.map((c) => c.chunkId),
      groundingStatus,
      answerSnippet: (answerResult.answer || '').substring(0, 100),
    };

    fs.writeFileSync(cacheFile, JSON.stringify(results, null, 2), 'utf-8');

    console.log(
      `[Result ${q.id}] Sufficiency: ${sufficiency.sufficiencyState} | Behavior: ${answerBehavior} | Citations: ${answerResult.citations.length} | Grounding: ${groundingStatus}`
    );
    console.log(`Answer excerpt: ${answerResult.answer?.substring(0, 80)}...\n`);
  }

  console.log('\n=== SUMMARY FOR REPORT ===');
  for (const id of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const r = results[id];
    if (!r) continue;
    console.log(`${id}:`);
    console.log(`- SUFFICIENCY: ${r.sufficiencyState}`);
    console.log(`- ANSWER_BEHAVIOR: ${r.answerBehavior}`);
    console.log(`- CITATIONS: ${r.citationsCount} (${r.citedChunks.join(', ') || 'none'})`);
    console.log(`- GROUNDING: ${r.groundingStatus}`);
  }
}

evaluateStep7().catch((err) => {
  console.error('Step 7 evaluation failed:', err);
  process.exit(1);
});
