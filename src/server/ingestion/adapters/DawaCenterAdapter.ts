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

export class DawaCenterAdapter implements ISourceAdapter {
  readonly sourceId = 'src_dawa_center';

  getSourceDefinition(): TrustedSource {
    return {
      sourceId: this.sourceId,
      name: 'المستودع الدعوي الرقمي (dawa.center)',
      author: 'المستودع الدعوي الرقمي',
      era: 'المعاصر',
      category: 'موضوعات إسلامية عامة والدعوة',
      description: 'مستودع رقمي موثق للدراسات والملفات والمقالات والبحوث الدعوية والتاريخية.',
      officialUrl: 'https://dawa.center',
      isVerified: true,
    };
  }

  async ingestSample(): Promise<IngestionResult> {
    const source = this.getSourceDefinition();
    const sampleTargets = [
      {
        url: 'https://dawa.center/file/10350',
        fileId: '10350',
        title: 'المنهج العقلي واستخداماته في الدعوة من خلال القرآن الكريم والسنة النبوية',
        topic: 'الشبهات حول الإسلام',
      },
      {
        url: 'https://dawa.center/file/10352',
        fileId: '10352',
        title: 'العلماء هم الدعاة — مكانة أهل العلم وأصول الاجتهاد',
        topic: 'اختلاف العلماء والاجتهاد',
      },
      {
        url: 'https://dawa.center/file/10345',
        fileId: '10345',
        title: 'الدعوة إلى الله وعلاقتها بالاستماع إلى القرآن الكريم وتدبره',
        topic: 'القرآن ومصدره',
      },
      {
        url: 'https://dawa.center/file/10349',
        fileId: '10349',
        title: 'المناهج الدعوية وتطبيقاتها النبوية — الحكمة والموعظة الحسنة',
        topic: 'انتشار الإسلام والسياق التاريخي',
      },
      {
        url: 'https://dawa.center/file/10354',
        fileId: '10354',
        title: 'المهارة في تحديد الهدف الدعوي في ضوء الكتاب والسنة',
        topic: 'الموضوعات الدعوية العامة',
      },
      {
        url: 'https://dawa.center/file/10353',
        fileId: '10353',
        title: 'المسؤولية الدعوية لصناع المحتوى في وسائل التواصل الاجتماعي',
        topic: 'الموضوعات الدعوية العامة',
      },
      {
        url: 'https://dawa.center/file/10347',
        fileId: '10347',
        title: 'سيرة أم المؤمنين أم سلمة رضي الله عنها وجهودها الدعوية',
        topic: 'الموضوعات الدعوية العامة',
      },
      {
        url: 'https://dawa.center/file/10346',
        fileId: '10346',
        title: 'دور الدعاة إلى الله بالحكمة — الحسن البصري أنموذجاً',
        topic: 'الموضوعات الدعوية العامة',
      },
      {
        url: 'https://dawa.center/file/10348',
        fileId: '10348',
        title: 'الكوكب الدري في مناقب المربين وتاريخ الدعوة',
        topic: 'انتشار الإسلام والسياق التاريخي',
      },
      {
        url: 'https://dawa.center/file/10351',
        fileId: '10351',
        title: 'عيون المآثر في تراجم أهل العلم ومآثرهم الدعوية',
        topic: 'اختلاف العلماء والاجتهاد',
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

        const documentId = `doc_dawa_center_file_${target.fileId}`;
        const doc: KnowledgeDocument = {
          documentId,
          sourceId: this.sourceId,
          title: target.title,
          author: 'المستودع الدعوي الرقمي',
          category: source.category,
          metadata: {
            fileId: target.fileId,
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
            fileId: target.fileId,
            section: 'المكتبة الرقمية الدعوية',
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
        reason: 'تعذر الوصول إلى ملفات العينة لـ dawa.center',
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
