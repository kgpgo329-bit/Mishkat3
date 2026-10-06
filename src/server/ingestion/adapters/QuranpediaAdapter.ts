import {
  ISourceAdapter,
  IngestionResult,
} from './ISourceAdapter.js';
import {
  TrustedSource,
  KnowledgeDocument,
  KnowledgeChunk,
} from '../../../shared/types/index.js';
import { cleanHtmlText } from '../cleaner.js';
import { chunkDocumentText } from '../chunker.js';

export class QuranpediaAdapter implements ISourceAdapter {
  readonly sourceId = 'src_quranpedia';

  getSourceDefinition(): TrustedSource {
    return {
      sourceId: this.sourceId,
      name: 'Quranpedia (موسوعة القرآن الكريم)',
      author: 'مشروع موسوعة القرآن الكريم الرقمية',
      era: 'المعاصر',
      category: 'التفسير وعلوم القرآن',
      description: 'موسوعة قرآنية رقمية شاملة توثق بيانات السور والتفاسير وأسباب النزول والمصاحف.',
      officialUrl: 'https://quranpedia.net',
      isVerified: true,
    };
  }

  async ingestSample(): Promise<IngestionResult> {
    const source = this.getSourceDefinition();
    const sampleTargets = [
      {
        url: 'https://quranpedia.net/surah/1',
        surahNumber: 1,
        title: 'سورة الفاتحة — أسباب النزول والتعريف',
        topic: 'تفسير السور والآيات',
      },
      {
        url: 'https://quranpedia.net/surah/112',
        surahNumber: 112,
        title: 'سورة الإخلاص — التعريف وفضائل التوحيد',
        topic: 'العقيدة والتوحيد',
      },
      {
        url: 'https://quranpedia.net/surah/109',
        surahNumber: 109,
        title: 'سورة الكافرون — البراءة من الشرك وإخلاص الدين',
        topic: 'العقيدة والتوحيد',
      },
      {
        url: 'https://quranpedia.net/surah/113',
        surahNumber: 113,
        title: 'سورة الفلق — معاني الاستعاذة والبيان',
        topic: 'تفسير السور والآيات',
      },
      {
        url: 'https://quranpedia.net/surah/114',
        surahNumber: 114,
        title: 'سورة الناس — ربوبية الله وعصمة المؤمن',
        topic: 'العقيدة والتوحيد',
      },
      {
        url: 'https://quranpedia.net/surah/106',
        surahNumber: 106,
        title: 'سورة قريش — عبادة رب البيت الحرام',
        topic: 'الكعبة والقبلة',
      },
      {
        url: 'https://quranpedia.net/surah/105',
        surahNumber: 105,
        title: 'سورة الفيل — حماية الكعبة المشرفة وتاريخها',
        topic: 'الكعبة والقبلة',
      },
      {
        url: 'https://quranpedia.net/surah/2',
        surahNumber: 2,
        title: 'سورة البقرة — آيات تحويل القبلة والتوحيد',
        topic: 'الكعبة والقبلة',
      },
      {
        url: 'https://quranpedia.net/surah/3',
        surahNumber: 3,
        title: 'سورة آل عمران — أول بيت وضع للناس ومكانة الحرم',
        topic: 'الكعبة والقبلة',
      },
      {
        url: 'https://quranpedia.net/surah/17',
        surahNumber: 17,
        title: 'سورة الإسراء — إعجاز القرآن وتحدي الإنس والجن',
        topic: 'القرآن ومصدره',
      },
      {
        url: 'https://quranpedia.net/surah/25',
        surahNumber: 25,
        title: 'سورة الفرقان — تنزيل القرآن والرد على شبهات المشركين',
        topic: 'الشبهات حول الإسلام',
      },
      {
        url: 'https://quranpedia.net/surah/11',
        surahNumber: 11,
        title: 'سورة هود — تحدي القرآن بالحجة والبرهان',
        topic: 'القرآن ومصدره',
      },
      {
        url: 'https://quranpedia.net/surah/52',
        surahNumber: 52,
        title: 'سورة الطور — دحض دعوى تأليف القرآن',
        topic: 'القرآن ومصدره',
      },
      {
        url: 'https://quranpedia.net/surah/10',
        surahNumber: 10,
        title: 'سورة يونس — استحالة افتراء القرآن من دون الله',
        topic: 'القرآن ومصدره',
      },
    ];

    const documents: KnowledgeDocument[] = [];
    const chunks: KnowledgeChunk[] = [];

    for (const target of sampleTargets) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(target.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MishkatIngestion/1.0',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          continue; // Skip failed page safely
        }

        const html = await response.text();
        const cleaned = cleanHtmlText(html);

        if (cleaned.length < 50) {
          continue;
        }

        const documentId = `doc_quranpedia_surah_${target.surahNumber}`;
        const doc: KnowledgeDocument = {
          documentId,
          sourceId: this.sourceId,
          title: target.title,
          author: 'مشروع موسوعة القرآن الكريم',
          category: source.category,
          metadata: {
            surahNumber: target.surahNumber,
            topic: target.topic,
            officialUrl: target.url,
            crawledAt: new Date().toISOString(),
          },
        };
        documents.push(doc);

        const docChunks = chunkDocumentText(cleaned, {
          documentId,
          sourceId: this.sourceId,
          sourceName: source.name,
          officialUrl: target.url,
          category: source.category,
          title: target.title,
          locatorMetadata: {
            surahNumber: target.surahNumber,
            section: 'علوم السورة',
            topic: target.topic,
          },
        });

        // Store up to 4 high-quality chunks per surah document
        chunks.push(...docChunks.slice(0, 4));
      } catch {
        // Safe skip on network error
      }
    }

    if (documents.length === 0) {
      return {
        source,
        status: 'REGISTERED_NOT_INGESTED',
        reason: 'تعذر الاتصال بصفحات العينة لـ Quranpedia',
        documents: [],
        chunks: [],
      };
    }

    return {
      source,
      status: 'INGESTED',
      documents,
      chunks,
    };
  }
}
