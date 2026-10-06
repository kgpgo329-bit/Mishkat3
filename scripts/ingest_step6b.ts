import dotenv from 'dotenv';
dotenv.config();

import { LocalJsonKnowledgeRepository } from '../src/server/repository/LocalJsonKnowledgeRepository.js';
import { chunkDocumentText } from '../src/server/ingestion/chunker.js';
import { EmbeddingService } from '../src/server/retrieval/embeddingService.js';
import { KnowledgeDocument, KnowledgeChunk } from '../src/shared/types/index.js';

interface IngestTarget {
  docId: string;
  title: string;
  sourceUrl: string;
  category: string;
  topic: string;
  fetchFn: () => Promise<string>;
}

async function fetchFromQuranpedia(path: string): Promise<string> {
  const url = `https://quranpedia.net${path}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 MishkatStep6B/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return await res.text();
}

async function main() {
  console.log('=== STEP 6B TARGETED INGESTION ===\n');

  const repo = new LocalJsonKnowledgeRepository();
  const embService = new EmbeddingService();

  const initialStats = repo.getStats();
  const initialCachedEmbeddings = embService.getCachedCount();
  console.log(`Initial repo: ${initialStats.documentsCount} docs, ${initialStats.chunksCount} chunks.`);
  console.log(`Initial cached embeddings: ${initialCachedEmbeddings}`);

  const targets: IngestTarget[] = [
    // 1. Tafsir Surah Al-Ikhlas (Gap F)
    {
      docId: 'doc_qp_tafsir_ikhlas_muyassar',
      title: 'تفسير سورة الإخلاص — التفسير الميسر',
      sourceUrl: 'https://quranpedia.net/surah/1/112/book/2012.md',
      category: 'التفسير وعلوم القرآن',
      topic: 'العقيدة والتوحيد',
      fetchFn: async () => {
        const md = await fetchFromQuranpedia('/surah/1/112/book/2012.md');
        // Clean markdown header
        return md.replace(/^---[\s\S]*?---\s*/, '').replace(/📖.*?\n/, '').trim();
      },
    },
    // 2. Tafsir Surah Quraysh — Worshiping the Lord of the House, Kaaba (Gap A)
    {
      docId: 'doc_qp_tafsir_quraysh_muyassar',
      title: 'تفسير سورة قريش — عبادة رب البيت الحرام والكعبة المشرفة',
      sourceUrl: 'https://quranpedia.net/surah/1/106/book/2012.md',
      category: 'التفسير وعلوم القرآن',
      topic: 'الكعبة والقبلة',
      fetchFn: async () => {
        const md = await fetchFromQuranpedia('/surah/1/106/book/2012.md');
        return md.replace(/^---[\s\S]*?---\s*/, '').replace(/📖.*?\n/, '').trim();
      },
    },
    // 3. Tafsir Surah Al-Baqarah (Qibla Verses 2:142 - 2:150) (Gap A)
    {
      docId: 'doc_qp_tafsir_qibla_muyassar',
      title: 'سورة البقرة — تحويل القبلة إلى المسجد الحرام والتوجه شطر الكعبة',
      sourceUrl: 'https://quranpedia.net/surah/1/2/book/2012.md',
      category: 'التفسير وعلوم القرآن',
      topic: 'الكعبة والقبلة',
      fetchFn: async () => {
        const md = await fetchFromQuranpedia('/surah/1/2/book/2012.md');
        // Extract from 2:142 to 2:150
        const start = md.indexOf('### الآية 2:142');
        const end = md.indexOf('### الآية 2:151');
        if (start !== -1 && end !== -1) {
          return md.slice(start, end).trim();
        }
        return md.slice(start, start + 3000).trim();
      },
    },
    // 4. Differences of Interpretation & Judicial Reasoning (Gap D)
    {
      docId: 'doc_qp_tafsir_ikhtilaf_al_anbiya',
      title: 'سورة الأنبياء والنساء — اختلاف الأحكام وتنوع الاجتهاد والأفهام مع اتحاد المصدر',
      sourceUrl: 'https://quranpedia.net/surah/1/21/book/2012.md',
      category: 'التفسير وعلوم القرآن',
      topic: 'اختلاف العلماء والاجتهاد',
      fetchFn: async () => {
        const anbiya = await fetchFromQuranpedia('/surah/1/21/book/2012.md');
        const nisa = await fetchFromQuranpedia('/surah/1/4/book/2012.md');

        const part1Start = anbiya.indexOf('### الآية 21:78');
        const part1End = anbiya.indexOf('### الآية 21:81');
        const text1 = part1Start !== -1 ? anbiya.slice(part1Start, part1End !== -1 ? part1End : part1Start + 2000) : '';

        const part2Start = nisa.indexOf('### الآية 4:59');
        const part2End = nisa.indexOf('### الآية 4:61');
        const text2 = part2Start !== -1 ? nisa.slice(part2Start, part2End !== -1 ? part2End : part2Start + 2000) : '';

        return `${text1}\n\n---\n\n${text2}`.trim();
      },
    },
    // 5. Divine Origin of Quran & Non-Human Authorship (Gap B)
    {
      docId: 'doc_qp_tafsir_quran_revelation',
      title: 'سورة الفرقان ويونس — تنزيل القرآن من الله تعالى ونفي كونه من تأليف البشر',
      sourceUrl: 'https://quranpedia.net/surah/1/25/book/2012.md',
      category: 'التفسير وعلوم القرآن',
      topic: 'القرآن ومصدره',
      fetchFn: async () => {
        const furqan = await fetchFromQuranpedia('/surah/1/25/book/2012.md');
        const yunus = await fetchFromQuranpedia('/surah/1/10/book/2012.md');

        const part1Start = furqan.indexOf('### الآية 25:1');
        const part1End = furqan.indexOf('### الآية 25:5');
        const text1 = part1Start !== -1 ? furqan.slice(part1Start, part1End !== -1 ? part1End : part1Start + 2500) : '';

        const part2Start = yunus.indexOf('### الآية 10:37');
        const part2End = yunus.indexOf('### الآية 10:39');
        const text2 = part2Start !== -1 ? yunus.slice(part2Start, part2End !== -1 ? part2End : part2Start + 2000) : '';

        return `${text1}\n\n---\n\n${text2}`.trim();
      },
    },
    // 6. Freedom of Religion & Dawah with Wisdom (Gap C)
    {
      docId: 'doc_qp_tafsir_no_compulsion_jihad',
      title: 'القرآن الكريم — لا إكراه في الدين والدعوة بالحكمة ومشروعية القتال لدفع الظلم',
      sourceUrl: 'https://quranpedia.net/surah/1/2/book/2012.md',
      category: 'التفسير وعلوم القرآن',
      topic: 'انتشار الإسلام والسياق التاريخي',
      fetchFn: async () => {
        const baqarah = await fetchFromQuranpedia('/surah/1/2/book/2012.md');
        const nahl = await fetchFromQuranpedia('/surah/1/16/book/2012.md');
        const hajj = await fetchFromQuranpedia('/surah/1/22/book/2012.md');

        const p1Start = baqarah.indexOf('### الآية 2:256');
        const p1End = baqarah.indexOf('### الآية 2:257');
        const t1 = p1Start !== -1 ? baqarah.slice(p1Start, p1End !== -1 ? p1End : p1Start + 1500) : '';

        const p2Start = nahl.indexOf('### الآية 16:125');
        const p2End = nahl.indexOf('### الآية 16:126');
        const t2 = p2Start !== -1 ? nahl.slice(p2Start, p2End !== -1 ? p2End : p2Start + 1500) : '';

        const p3Start = hajj.indexOf('### الآية 22:39');
        const p3End = hajj.indexOf('### الآية 22:41');
        const t3 = p3Start !== -1 ? hajj.slice(p3Start, p3End !== -1 ? p3End : p3Start + 1500) : '';

        return `${t1}\n\n---\n\n${t2}\n\n---\n\n${t3}`.trim();
      },
    },
  ];

  const addedDocs: KnowledgeDocument[] = [];
  const addedChunks: KnowledgeChunk[] = [];

  for (const t of targets) {
    try {
      console.log(`Processing ${t.docId}: "${t.title}"...`);
      const rawText = await t.fetchFn();
      if (!rawText || rawText.length < 100) {
        console.warn(`Skipping ${t.docId}: text too short (${rawText.length} chars)`);
        continue;
      }

      const doc: KnowledgeDocument = {
        documentId: t.docId,
        sourceId: 'src_quranpedia',
        title: t.title,
        author: 'مجمع الملك فهد لطباعة المصحف الشريف — التفسير الميسر',
        category: t.category,
        sourceUrl: t.sourceUrl,
        metadata: {
          topic: t.topic,
          bookName: 'التفسير الميسر',
          officialUrl: t.sourceUrl,
        },
      };

      await repo.addDocument(doc);
      addedDocs.push(doc);

      const chunks = chunkDocumentText(rawText, {
        documentId: t.docId,
        sourceId: 'src_quranpedia',
        sourceName: 'الموسوعة القرآنية (Quranpedia) — التفسير الميسر',
        officialUrl: t.sourceUrl,
        category: t.category,
        title: t.title,
        locatorMetadata: {
          topic: t.topic,
          bookName: 'التفسير الميسر',
          officialUrl: t.sourceUrl,
        },
      }, {
        minChunkLength: 80,
        maxChunkLength: 700,
      });

      for (const chunk of chunks) {
        if (!repo.hasChunkHash(chunk.contentHash)) {
          await repo.addChunk(chunk);
          addedChunks.push(chunk);
        }
      }

      console.log(`  Added ${chunks.length} chunks for ${t.docId}`);
    } catch (err: any) {
      console.error(`  Error ingesting ${t.docId}:`, err.message);
    }
  }

  const finalStats = repo.getStats();
  console.log(`\nRepository updated: ${finalStats.documentsCount} documents, ${finalStats.chunksCount} chunks.`);
  console.log(`New documents added: ${addedDocs.length}`);
  console.log(`New chunks added: ${addedChunks.length}`);

  // Embed only newly added chunks
  console.log('\nEmbedding ONLY newly added chunks...');
  await embService.ensureChunksEmbedded(addedChunks);
  const finalCachedEmbeddings = embService.getCachedCount();
  console.log(`Embeddings cached: ${finalCachedEmbeddings} (added: ${finalCachedEmbeddings - initialCachedEmbeddings})`);
}

main().catch(console.error);
