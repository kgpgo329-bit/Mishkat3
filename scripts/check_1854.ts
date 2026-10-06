import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';

async function check1854() {
  const repo = new LocalJsonKnowledgeRepository();
  const chunks = await repo.getChunksByDocumentId('doc_islamic_content_term_1854');
  console.log('Doc 1854 chunks:');
  for (const c of chunks) {
    console.log(`[${c.chunkId}] length=${c.text.length}`);
    console.log(`  Snippet: ${c.text.substring(0, 160).replace(/\n/g, ' ')}...`);
  }
}

check1854();
