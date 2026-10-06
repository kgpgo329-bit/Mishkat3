import { BM25LexicalScorer } from '../src/server/retrieval/lexicalScorer.js';
import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';

async function checkDoc1904Scores() {
  const repo = new LocalJsonKnowledgeRepository();
  const chunks = await repo.searchChunks({ query: '', limit: 200 });

  const claimB = 'القرآن الكريم وحي منزل من الله تعالى على النبي محمد صلى الله عليه وسلم';
  const scorer = new BM25LexicalScorer();
  const lexScores = scorer.scoreChunks(claimB, chunks);

  const doc1904Chunks = chunks.filter(c => c.documentId === 'doc_islamic_content_term_1904');
  console.log('Scores for doc 1904 chunks:');
  for (const c of doc1904Chunks) {
    console.log(`  [${c.chunkId}] lexScore=${lexScores.get(c.chunkId)} | snippet: ${c.text.substring(0, 80).replace(/\n/g, ' ')}...`);
  }
}

checkDoc1904Scores();
