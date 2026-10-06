import dotenv from 'dotenv';
dotenv.config();

import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';
import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';
import { chunkDocumentText } from '../src/server/ingestion/chunker.js';
import { EmbeddingService } from '../src/server/retrieval/embeddingService.js';
import { HybridRetriever } from '../src/server/retrieval/hybridRetriever.js';
import { KnowledgeDocument, KnowledgeChunk } from '../src/shared/types/index.js';

interface TargetDef {
  sourceId: string;
  sourceName: string;
  category: string;
  url: string;
  docId: string;
  title: string;
  author: string;
  topic: string;
}

const NEW_TARGETS: TargetDef[] = [
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/692',
    docId: 'doc_islamic_content_term_692',
    title: 'الجمهرة — غير المسلمين وحقوقهم والبر بهم في الإسلام',
    author: 'مشروع المحتوى الإسلامي (islamic-content.com)',
    topic: 'الشبهات حول الإسلام',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/699',
    docId: 'doc_islamic_content_term_699',
    title: 'الجمهرة — الحكمة في الدعوة ومنهج البلاغ في القرآن',
    author: 'مشروع المحتوى الإسلامي (islamic-content.com)',
    topic: 'انتشار الإسلام والسياق التاريخي',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/700',
    docId: 'doc_islamic_content_term_700',
    title: 'الجمهرة — الموعظة الحسنة والرفق بالمدعوين ونبذ الإكراه',
    author: 'مشروع المحتوى الإسلامي (islamic-content.com)',
    topic: 'انتشار الإسلام والسياق التاريخي',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/701',
    docId: 'doc_islamic_content_term_701',
    title: 'الجمهرة — المجادلة بالتي هي أحسن والحجة والبيان',
    author: 'مشروع المحتوى الإسلامي (islamic-content.com)',
    topic: 'الشبهات حول الإسلام',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/764',
    docId: 'doc_islamic_content_term_764',
    title: 'الجمهرة — الغزوات والسرايا والبعوث ومقاصد مشروعية القتال للدفاع',
    author: 'مشروع المحتوى الإسلامي (islamic-content.com)',
    topic: 'الشبهات حول الإسلام',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/813',
    docId: 'doc_islamic_content_term_813',
    title: 'الجمهرة — غزوة الحديبية وصلح المسالمة وانتشار الإسلام سلماً',
    author: 'مشروع المحتوى الإسلامي (islamic-content.com)',
    topic: 'انتشار الإسلام والسياق التاريخي',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/833',
    docId: 'doc_islamic_content_term_833',
    title: 'الجمهرة — فتح مكة والعفو العام ودخول الناس في الدين أفواجاً',
    author: 'مشروع المحتوى الإسلامي (islamic-content.com)',
    topic: 'انتشار الإسلام والسياق التاريخي',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/2200',
    docId: 'doc_islamic_content_term_2200',
    title: 'الجمهرة — رحمة النبي صلى الله عليه وسلم وشفقته ونفي الإكراه',
    author: 'مشروع المحتوى الإسلامي (islamic-content.com)',
    topic: 'الشبهات حول الإسلام',
  },
  {
    sourceId: 'src_dawa_center',
    sourceName: 'المستودع الدعوي الرقمي (dawa.center)',
    category: 'موضوعات إسلامية عامة والدعوة',
    url: 'https://dawa.center/file/10344',
    docId: 'doc_dawa_center_file_10344',
    title: 'علماء الغرب يدخلون الإسلام — دراسة في الاقتناع العقلي دون إكراه',
    author: 'محمد حلمي',
    topic: 'الشبهات حول الإسلام',
  },
  {
    sourceId: 'src_dawa_center',
    sourceName: 'المستودع الدعوي الرقمي (dawa.center)',
    category: 'موضوعات إسلامية عامة والدعوة',
    url: 'https://dawa.center/file/10349',
    docId: 'doc_dawa_center_file_10349',
    title: 'المناهج الدعوية وتطبيقاتها النبوية — الحكمة والموعظة الحسنة',
    author: 'المستودع الدعوي الرقمي',
    topic: 'انتشار الإسلام والسياق التاريخي',
  },
];

async function ingestStep5B() {
  console.log('=== STEP 5B: INGEST TARGETED TOPIC C MATERIAL ===');

  const repo = new LocalJsonKnowledgeRepository();
  const initialStats = repo.getStats();
  console.log(`Initial repository state: ${initialStats.documentsCount} documents, ${initialStats.chunksCount} chunks.`);

  const embService = new EmbeddingService();
  const initialCachedEmbeddings = embService.getCachedCount();
  console.log(`Initial cached embeddings count: ${initialCachedEmbeddings}`);

  const addedDocs: KnowledgeDocument[] = [];
  const addedChunks: KnowledgeChunk[] = [];

  for (const t of NEW_TARGETS) {
    try {
      const existingDoc = await repo.getDocumentById(t.docId);
      if (existingDoc) {
        console.log(`Doc ${t.docId} already exists, skipping.`);
        continue;
      }

      const res = await fetch(t.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MishkatIngestion/1.0' },
      });
      if (!res.ok) {
        console.warn(`Failed to fetch ${t.url}: ${res.status}`);
        continue;
      }

      const html = await res.text();
      const cleaned = cleanHtmlText(html);

      if (cleaned.length < 100) continue;

      const doc: KnowledgeDocument = {
        documentId: t.docId,
        sourceId: t.sourceId,
        title: t.title,
        author: t.author,
        category: t.category,
        metadata: {
          topic: t.topic,
          officialUrl: t.url,
          crawledAt: new Date().toISOString(),
          step: '5B_targeted_expansion',
        },
      };

      await repo.addDocument(doc);
      addedDocs.push(doc);

      const allDocChunks = chunkDocumentText(cleaned, {
        documentId: t.docId,
        sourceId: t.sourceId,
        sourceName: t.sourceName,
        officialUrl: t.url,
        category: t.category,
        title: t.title,
        locatorMetadata: {
          topic: t.topic,
          officialUrl: t.url,
        },
      });

      // Filter out boilerplate-only chunks and select top substantive chunks
      const substantiveChunks = allDocChunks
        .filter((c) => c.text.length >= 150 && !c.text.startsWith('عبارات مقترحة'))
        .slice(0, 3); // Max 3 high-quality chunks per doc

      for (const chunk of substantiveChunks) {
        if (!repo.hasChunkHash(chunk.contentHash)) {
          await repo.addChunk(chunk);
          addedChunks.push(chunk);
        }
      }

      console.log(`Ingested ${t.docId}: ${substantiveChunks.length} chunks added.`);
    } catch (err) {
      console.error(`Error ingesting ${t.url}:`, err);
    }
  }

  const finalStats = repo.getStats();
  console.log(`\nUpdated repository state: ${finalStats.documentsCount} documents, ${finalStats.chunksCount} chunks.`);
  console.log(`New documents added: ${addedDocs.length}`);
  console.log(`New chunks added: ${addedChunks.length}`);

  // Embed ONLY newly added chunks
  console.log('\nEmbedding newly added chunks...');
  const newEmbeddingsMap = await embService.ensureChunksEmbedded(addedChunks);
  const finalCachedEmbeddings = embService.getCachedCount();
  const embeddingsAdded = finalCachedEmbeddings - initialCachedEmbeddings;

  console.log(`Embeddings added: ${embeddingsAdded} (Total cached: ${finalCachedEmbeddings})`);

  // Re-run retrieval ONLY for Challenge Question C
  console.log('\n=== RE-RUN RETRIEVAL ONLY FOR QUESTION C ===');
  const retriever = new HybridRetriever(repo, embService);
  const qC = 'هل الإسلام انتشر بالسيف؟';
  const claimsC = [
    'الإسلام انتشر بالحجة والبيان وحرية الاعتقاد ولا إكراه في الدين',
    'القتال والجهاد شُرع للدفاع ورد العدوان وتأمين حرية الدعوة وليس للإكراه',
  ];

  const resultC = await retriever.retrieve(
    {
      question: qC,
      claims: claimsC,
    },
    { topK: 5 }
  );

  console.log(`Question: "${resultC.question}"`);
  console.log(`Retrieval Mode: ${resultC.retrievalMode}`);
  console.log(`\nTop 5 Candidates for Question C:`);

  const top5 = resultC.allCandidates.slice(0, 5);
  top5.forEach((c, idx) => {
    console.log(`\n#${idx + 1} Chunk ID: ${c.chunkId}`);
    console.log(`   Title: ${c.title}`);
    console.log(`   Source: ${c.sourceName} (${c.sourceId})`);
    console.log(`   Scores: combined=${c.combinedScore}, lexical=${c.lexicalScore}, semantic=${c.semanticScore}`);
    console.log(`   Snippet: ${c.content.substring(0, 180).replace(/\n/g, ' ')}...`);
  });

  return {
    newDocuments: addedDocs.length,
    newChunks: addedChunks.length,
    totalChunks: finalStats.chunksCount,
    embeddingsAdded,
    top5,
  };
}

ingestStep5B().catch((e) => {
  console.error('Step 5B execution failed:', e);
  process.exit(1);
});
