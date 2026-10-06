import { Router, Request, Response, NextFunction } from 'express';
import { MishkatError } from '../../shared/errors/MishkatError.js';
import { DeepLearningResponse } from '../../shared/types/index.js';

import { interactionStorage } from '../storage/InMemoryInteractionStorage.js';

export const deepLearningRouter = Router();

deepLearningRouter.get('/:interactionId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const interactionId = req.params.interactionId as string;
    if (!interactionId) {
      throw MishkatError.badRequest('معرّف التفاعل مطلوب');
    }

    const saved = interactionStorage.get(interactionId);
    if (saved && saved.followUps && saved.followUps.length > 0) {
      res.json({
        success: true,
        data: {
          parentInteractionId: interactionId,
          topic: saved.understanding?.topic || saved.question,
          followUps: saved.followUps,
        },
      });
      return;
    }

    const response: DeepLearningResponse = {
      parentInteractionId: interactionId,
      topic: 'أركان الإيمان',
      followUps: [
        {
          id: `fu_${interactionId}_1`,
          question: 'ما الأدلة القرآنية على الإيمان بالقدر؟',
          type: 'دليل أعمق',
          origin: 'DEEP_LEARNING',
          parentInteractionId: interactionId,
        },
        {
          id: `fu_${interactionId}_2`,
          question: 'كيف يربط ابن تيمية بين التوكل والإيمان بالقضاء والقدر؟',
          type: 'مفهوم مرتبط',
          origin: 'DEEP_LEARNING',
          parentInteractionId: interactionId,
        },
        {
          id: `fu_${interactionId}_3`,
          question: 'ما الفرق بين القضاء والقدر عند أهل السنة والجماعة؟',
          type: 'مقارنة',
          origin: 'DEEP_LEARNING',
          parentInteractionId: interactionId,
        },
        {
          id: `fu_${interactionId}_4`,
          question: 'ما هو الأثر السلوكي للإيمان باليوم الآخر على حياة المسلم؟',
          type: 'أثر المسألة',
          origin: 'DEEP_LEARNING',
          parentInteractionId: interactionId,
        },
      ],
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
});
