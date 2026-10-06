import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';

async function searchQuran() {
  const repo = new LocalJsonKnowledgeRepository();
  const chunks = await repo.searchChunks({ query: 'القرآن', limit: 200 });
  console.log(`Chunks containing 'القرآن': ${chunks.length}`);
  for (const c of chunks.slice(0, 10)) {
    console.log(`[${c.chunkId}] ${c.title}`);
    console.log(`  ${c.text.substring(0, 100).replace(/\n/g, ' ')}...`);
  }
}

searchQuran();
