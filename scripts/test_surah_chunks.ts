import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';
import { chunkDocumentText } from '../src/server/ingestion/chunker.js';

async function testSurah(surahNum: number, title: string) {
  const url = `https://quranpedia.net/surah/${surahNum}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 MishkatTest/1.0' } });
  if (!res.ok) {
    console.log(`Surah ${surahNum} failed: ${res.status}`);
    return;
  }
  const html = await res.text();
  const cleaned = cleanHtmlText(html);
  const chunks = chunkDocumentText(cleaned, {
    documentId: `doc_quranpedia_surah_${surahNum}`,
    sourceId: 'src_quranpedia',
    sourceName: 'Quranpedia (موسوعة القرآن الكريم)',
    officialUrl: url,
    category: 'التفسير وعلوم القرآن',
    title,
  });

  console.log(`\n=== Surah ${surahNum}: ${title} (${chunks.length} chunks) ===`);
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    console.log(`Chunk #${i}: length=${c.text.length}`);
    // Check if relevant keywords appear
    if (
      c.text.includes('يقاتل') ||
      c.text.includes('سبيل ربك') ||
      c.text.includes('الحكمة') ||
      c.text.includes('ظلموا') ||
      c.text.includes('تقسطوا') ||
      c.text.includes('تبروهم') ||
      c.text.includes('إكراه') ||
      c.text.includes('الجهاد') ||
      c.text.includes('سيف')
    ) {
      console.log(`  -> RELEVANT KEYWORDS FOUND in chunk #${i}! Snippet:`);
      console.log(`     ${c.text.substring(0, 160).replace(/\n/g, ' ')}...`);
    }
  }
}

async function main() {
  await testSurah(16, 'سورة النحل — الدعوة بالحكمة والموعظة الحسنة');
  await testSurah(22, 'سورة الحج — الإذن بالقتال لرد الظلم والدفاع');
  await testSurah(60, 'سورة الممتحنة — القسط مع غير المقاتلين وحرية الدين');
  await testSurah(48, 'سورة الفتح — صلح الحديبية وانتشار الإسلام بالسلم');
}

main();
