import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';

async function checkKaabaChunks() {
  const repo = new LocalJsonKnowledgeRepository();
  const c1944 = await repo.getChunksByDocumentId('doc_islamic_content_term_1944');
  console.log(`Chunks for doc 1944 (${c1944.length}):`);
  for (const c of c1944) {
    console.log(`  [${c.chunkId}] ${c.title} -> ${c.text.substring(0, 150).replace(/\n/g, ' ')}...`);
  }

  const c1897 = await repo.getChunksByDocumentId('doc_islamic_content_term_1897');
  console.log(`\nChunks for doc 1897 (${c1897.length}):`);
  for (const c of c1897) {
    console.log(`  [${c.chunkId}] ${c.title} -> ${c.text.substring(0, 150).replace(/\n/g, ' ')}...`);
  }
}

checkKaabaChunks();
