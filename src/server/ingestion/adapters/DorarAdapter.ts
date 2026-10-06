import {
  ISourceAdapter,
  IngestionResult,
} from './ISourceAdapter.js';
import { TrustedSource } from '../../../shared/types/index.js';

export class DorarAdapter implements ISourceAdapter {
  readonly sourceId = 'src_dorar';

  getSourceDefinition(): TrustedSource {
    return {
      sourceId: this.sourceId,
      name: 'الدرر السنية (dorar.net)',
      author: 'مؤسسة الدرر السنية بإشراف الشيخ علوي بن عبد القادر السقاف',
      era: 'المعاصر',
      category: 'الحديث والعقيدة والفقه',
      description: 'موسوعة علمية إسلامية رائدة للحديث النبوي والعقيدة والفقه والمذاهب والأديان.',
      officialUrl: 'https://dorar.net',
      isVerified: true,
    };
  }

  async ingestSample(): Promise<IngestionResult> {
    const source = this.getSourceDefinition();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://dorar.net', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MishkatIngestion/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 403) {
        return {
          source,
          status: 'REGISTERED_NOT_INGESTED',
          reason: 'HTTP 403 Forbidden - Automated requests blocked by source CDN/bot protection',
          documents: [],
          chunks: [],
        };
      }

      if (!response.ok) {
        return {
          source,
          status: 'REGISTERED_NOT_INGESTED',
          reason: `HTTP ${response.status} - Source endpoint inaccessible`,
          documents: [],
          chunks: [],
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      return {
        source,
        status: 'REGISTERED_NOT_INGESTED',
        reason: `Connection error: ${msg}`,
        documents: [],
        chunks: [],
      };
    }

    // Default safe fallback if content unusable
    return {
      source,
      status: 'REGISTERED_NOT_INGESTED',
      reason: 'Automated extraction not supported without authorized data partnership',
      documents: [],
      chunks: [],
    };
  }
}
