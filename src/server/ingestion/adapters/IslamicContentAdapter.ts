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

export class IslamicContentAdapter implements ISourceAdapter {
  readonly sourceId = 'src_islamic_content';

  getSourceDefinition(): TrustedSource {
    return {
      sourceId: this.sourceId,
      name: 'الجمهرة — موسوعة مفردات المحتوى الإسلامي',
      author: 'مشروع المحتوى الإسلامي (islamic-content.com)',
      era: 'المعاصر',
      category: 'معاجم ومصطلحات المحتوى الإسلامي',
      description: 'موسوعة إلكترونية شاملة لمفردات ومصطلحات ومعاجم المحتوى الإسلامي.',
      officialUrl: 'https://islamic-content.com',
      isVerified: true,
    };
  }

  async ingestSample(): Promise<IngestionResult> {
    const source = this.getSourceDefinition();
    const sampleTargets = [
      {
        url: 'https://islamic-content.com/t/1900',
        termId: '1900',
        title: 'الجمهرة — دلالة اسم الله الغفار',
        topic: 'العقيدة والتوحيد',
      },
      {
        url: 'https://islamic-content.com/t/1854',
        termId: '1854',
        title: 'الجمهرة — معنى التوحيد وحقيقته الشرعية',
        topic: 'العقيدة والتوحيد',
      },
      {
        url: 'https://islamic-content.com/t/1916',
        termId: '1916',
        title: 'الجمهرة — توحيد العبادة وإفراد الله بالخلق والأمر',
        topic: 'العقيدة والتوحيد',
      },
      {
        url: 'https://islamic-content.com/t/1934',
        termId: '1934',
        title: 'الجمهرة — بيان الشرك ومنافاته لأصل التوحيد',
        topic: 'العقيدة والتوحيد',
      },
      {
        url: 'https://islamic-content.com/t/1904',
        termId: '1904',
        title: 'الجمهرة — تعريف القرآن الكريم وخصائصه الإعجازية',
        topic: 'القرآن ومصدره',
      },
      {
        url: 'https://islamic-content.com/t/1909',
        termId: '1909',
        title: 'الجمهرة — الوحي الإلهي ومصدر الرسالة',
        topic: 'القرآن ومصدره',
      },
      {
        url: 'https://islamic-content.com/t/1922',
        termId: '1922',
        title: 'الجمهرة — السنة النبوية الشريفة وحجيتها',
        topic: 'الحديث ومكانته',
      },
      {
        url: 'https://islamic-content.com/t/1873',
        termId: '1873',
        title: 'الجمهرة — الحديث النبوي ودرجاته وقواعد الرواية',
        topic: 'الحديث ومكانته',
      },
      {
        url: 'https://islamic-content.com/t/1897',
        termId: '1897',
        title: 'الجمهرة — القبلة وحكم التوجه شطر المسجد الحرام',
        topic: 'الكعبة والقبلة',
      },
      {
        url: 'https://islamic-content.com/t/1944',
        termId: '1944',
        title: 'الجمهرة — الكعبة المشرفة وتوحيد التعبد لرب البيت',
        topic: 'الكعبة والقبلة',
      },
      {
        url: 'https://islamic-content.com/t/1950',
        termId: '1950',
        title: 'الجمهرة — الاجتهاد الفقهي وشروط النظر في الأدلة',
        topic: 'اختلاف العلماء والاجتهاد',
      },
      {
        url: 'https://islamic-content.com/t/1879',
        termId: '1879',
        title: 'الجمهرة — اختلاف العلماء ومقاصد رحمة التشريع',
        topic: 'اختلاف العلماء والاجتهاد',
      },
      {
        url: 'https://islamic-content.com/t/1875',
        termId: '1875',
        title: 'الجمهرة — مقاصد الشريعة في الدعوة ونفي الإكراه',
        topic: 'انتشار الإسلام والسياق التاريخي',
      },
      {
        url: 'https://islamic-content.com/t/1859',
        termId: '1859',
        title: 'الجمهرة — مادة معجمية إسلامية محققة',
        topic: 'المفاهيم والمصطلحات الإسلامية',
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
          continue;
        }

        const html = await response.text();
        const cleaned = cleanHtmlText(html);

        if (cleaned.length < 50) {
          continue;
        }

        const documentId = `doc_islamic_content_term_${target.termId}`;
        const doc: KnowledgeDocument = {
          documentId,
          sourceId: this.sourceId,
          title: target.title,
          author: 'مشروع الجمهرة للمحتوى الإسلامي',
          category: source.category,
          metadata: {
            termId: target.termId,
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
            termId: target.termId,
            section: 'معجم الجمهرة',
            topic: target.topic,
          },
        });

        chunks.push(...docChunks.slice(0, 4));
      } catch {
        // Safe skip on network error
      }
    }

    if (documents.length === 0) {
      return {
        source,
        status: 'REGISTERED_NOT_INGESTED',
        reason: 'تعذر الوصول إلى صفحات العينة لـ islamic-content.com',
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
