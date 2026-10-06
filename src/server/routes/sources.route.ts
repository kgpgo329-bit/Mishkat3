import { Router, Request, Response, NextFunction } from 'express';
import { TrustedSource } from '../../shared/types/index.js';
import { LocalJsonKnowledgeRepository } from '../repository/LocalJsonKnowledgeRepository.js';

export const sourcesRouter = Router();

const repo = new LocalJsonKnowledgeRepository();

sourcesRouter.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawSources = await repo.getAllSources();

    const enrichedSources: TrustedSource[] = await Promise.all(
      rawSources.map(async (src) => {
        const docs = await repo.getDocumentsBySourceId(src.sourceId);
        const docCount = docs.length;

        if (src.sourceId === 'src_dorar' || docCount === 0) {
          return {
            ...src,
            status: 'REGISTERED_NOT_INGESTED',
            documentCount: 0,
            chunkCount: 0,
            statusNote:
              'مصدر معتمد ومسجل، ولكن لم يتم استيراده نظراً لحماية الخادم (HTTP 403). لم يُستخدم كدليل مسترجع.',
          };
        }

        return {
          ...src,
          status: 'INGESTED',
          documentCount: docCount,
          statusNote: 'مستورد ومفهرس بنجاح في مستودع المعرفة المعتمد لمشكاة.',
        };
      })
    );

    res.json({
      success: true,
      data: enrichedSources,
    });
  } catch (error) {
    next(error);
  }
});
