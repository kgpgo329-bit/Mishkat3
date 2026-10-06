import { cleanHtmlText } from '../src/server/ingestion/cleaner.js';
import { chunkDocumentText } from '../src/server/ingestion/chunker.js';

interface Target {
  sourceId: string;
  sourceName: string;
  category: string;
  url: string;
  title: string;
  topic: string;
  docId: string;
}

const TARGETS: Target[] = [
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/692',
    docId: 'doc_islamic_content_term_692',
    title: 'الجمهرة — غير المسلمين وحقوقهم والبر بهم في الإسلام',
    topic: 'الشبهات حول الإسلام',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/699',
    docId: 'doc_islamic_content_term_699',
    title: 'الجمهرة — الحكمة في الدعوة ومنهج البلاغ في القرآن',
    topic: 'انتشار الإسلام والسياق التاريخي',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/700',
    docId: 'doc_islamic_content_term_700',
    title: 'الجمهرة — الموعظة الحسنة والرفق بالمدعوين ونبذ الإكراه',
    topic: 'انتشار الإسلام والسياق التاريخي',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/701',
    docId: 'doc_islamic_content_term_701',
    title: 'الجمهرة — المجادلة بالتي هي أحسن والحجة والبيان',
    topic: 'الشبهات حول الإسلام',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/764',
    docId: 'doc_islamic_content_term_764',
    title: 'الجمهرة — الغزوات والسرايا والبعوث ومقاصد مشروعية القتال للدفاع',
    topic: 'الشبهات حول الإسلام',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/813',
    docId: 'doc_islamic_content_term_813',
    title: 'الجمهرة — غزوة الحديبية وصلح المسالمة وانتشار الإسلام سلماً',
    topic: 'انتشار الإسلام والسياق التاريخي',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/833',
    docId: 'doc_islamic_content_term_833',
    title: 'الجمهرة — فتح مكة والعفو العام ودخول الناس في الدين أفواجاً',
    topic: 'انتشار الإسلام والسياق التاريخي',
  },
  {
    sourceId: 'src_islamic_content',
    sourceName: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
    category: 'معاجم ومصطلحات المحتوى الإسلامي',
    url: 'https://islamic-content.com/t/2200',
    docId: 'doc_islamic_content_term_2200',
    title: 'الجمهرة — رحمة النبي صلى الله عليه وسلم وشفقته ونفي الإكراه',
    topic: 'الشبهات حول الإسلام',
  },
  {
    sourceId: 'src_dawa_center',
    sourceName: 'المستودع الدعوي الرقمي (dawa.center)',
    category: 'موضوعات إسلامية عامة والدعوة',
    url: 'https://dawa.center/file/10344',
    docId: 'doc_dawa_center_file_10344',
    title: 'علماء الغرب يدخلون الإسلام — دراسة في الاقتناع العقلي دون إكراه',
    topic: 'الشبهات حول الإسلام',
  },
  {
    sourceId: 'src_dawa_center',
    sourceName: 'المستودع الدعوي الرقمي (dawa.center)',
    category: 'موضوعات إسلامية عامة والدعوة',
    url: 'https://dawa.center/file/10349',
    docId: 'doc_dawa_center_file_10349',
    title: 'المناهج الدعوية وتطبيقاتها النبوية — الحكمة والموعظة الحسنة',
    topic: 'انتشار الإسلام والسياق التاريخي',
  },
];

async function testFetch() {
  console.log(`Testing fetch and chunking for ${TARGETS.length} targeted documents:`);
  for (const t of TARGETS) {
    try {
      const res = await fetch(t.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MishkatIngestion/1.0' },
      });
      if (!res.ok) {
        console.log(`[FAILED ${res.status}] ${t.url}`);
        continue;
      }
      const html = await res.text();
      const cleaned = cleanHtmlText(html);
      const chunks = chunkDocumentText(cleaned, {
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

      console.log(`[OK] ${t.docId} -> "${t.title}" | cleaned=${cleaned.length} | chunks=${chunks.length}`);
    } catch (e: any) {
      console.log(`[ERR] ${t.url}:`, e.message);
    }
  }
}

testFetch();
