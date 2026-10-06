import dotenv from 'dotenv';
dotenv.config();

import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';
import { EmbeddingService } from '../src/server/retrieval/embeddingService.js';

async function main() {
  console.log('--- Populating Embeddings Cache for 130 Chunks ---');
  const repo = new LocalJsonKnowledgeRepository();
  const chunks = await repo.searchChunks({ query: '', limit: 500 });
  console.log(`Found ${chunks.length} chunks in repository.`);

  const embService = new EmbeddingService();
  console.log(`Embedding Service Available: ${embService.isAvailable()}`);
  console.log(`Model: ${embService.getModelName()}`);
  console.log(`Cached count before: ${embService.getCachedCount()}`);

  const startTime = Date.now();
  const vectors = await embService.ensureChunksEmbedded(chunks);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`Embedded ${vectors.size} chunks in ${elapsed}s`);
  console.log(`Cached count after: ${embService.getCachedCount()}`);
}

main().catch((err) => {
  console.error('Error populating embeddings:', err);
  process.exit(1);
});
