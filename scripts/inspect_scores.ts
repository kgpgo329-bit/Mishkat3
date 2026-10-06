import { BM25LexicalScorer } from '../src/server/retrieval/lexicalScorer.js';
import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';
import { EmbeddingService } from '../src/server/retrieval/embeddingService.js';

async function inspectScores() {
  const repo = new LocalJsonKnowledgeRepository();
  const chunks = await repo.searchChunks({ query: '', limit: 200 });

  const claimB = 'القرآن الكريم وحي منزل من الله تعالى على النبي محمد صلى الله عليه وسلم';
  const scorer = new BM25LexicalScorer();
  const lexScores = scorer.scoreChunks(claimB, chunks);

  const embService = new EmbeddingService();
  const vectors = await embService.ensureChunksEmbedded(chunks);
  const qVec = await embService.embedText(claimB);
  const semScores = qVec ? embService.scoreChunksWithVector(qVec, vectors) : new Map();

  const c1904 = chunks.find(c => c.chunkId === 'chk_doc_islamic_content_term_1904_3')!;
  const c2200 = chunks.find(c => c.chunkId === 'chk_doc_islamic_content_term_2200_2')!;

  console.log('chk_doc_islamic_content_term_1904_3:');
  console.log('  title:', c1904?.title);
  console.log('  lexicalScore:', lexScores.get(c1904?.chunkId));
  console.log('  semanticScore:', semScores.get(c1904?.chunkId));

  console.log('chk_doc_islamic_content_term_2200_2:');
  console.log('  title:', c2200?.title);
  console.log('  lexicalScore:', lexScores.get(c2200?.chunkId));
  console.log('  semanticScore:', semScores.get(c2200?.chunkId));
}

inspectScores();
