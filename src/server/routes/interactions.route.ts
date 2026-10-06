import { Router, Request, Response, NextFunction } from 'express';
import { MishkatError } from '../../shared/errors/MishkatError.js';
import { AskResponse } from '../../shared/types/index.js';

import { interactionStorage } from '../storage/InMemoryInteractionStorage.js';

export const interactionsRouter = Router();

interactionsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id) {
      throw MishkatError.badRequest('معرّف التفاعل مطلوب');
    }

    const saved = interactionStorage.get(id);
    if (saved) {
      res.json({
        success: true,
        data: saved,
      });
      return;
    }

    // Step 1 route skeleton: returns schema contract
    const interaction: AskResponse = {
      interactionId: id,
      status: 'ANSWERED',
      question: 'ما هي أركان الإيمان الستة؟',
      answer: 'أركان الإيمان الستة هي: الإيمان بالله، وملائكته، وكتبه، ورسله، واليوم الآخر، والقدر خيره وشره، كما جاء في حديث جبريل عليه السلام الصحيح.',
      claims: [
        'الإيمان بالله وملائكته وكتبه ورسله',
        'الإيمان باليوم الآخر',
        'الإيمان بالقدر خيره وشره'
      ],
      evidence: [],
      sources: [
        {
          sourceId: 'src_sahih_muslim',
          name: 'صحيح مسلم',
          author: 'الإمام مسلم بن الحجاج',
          category: 'الحديث',
          description: 'الجامع الصحيح المختصر من السنن بنقل العدل عن العدل عن رسول الله ﷺ',
          isVerified: true
        }
      ],
      followUps: [
        {
          id: 'fu_1',
          question: 'ما هو أثر الإيمان بالقدر على طمأنينة المؤمن؟',
          type: 'أثر المسألة',
          origin: 'DEEP_LEARNING',
          parentInteractionId: id,
        },
        {
          id: 'fu_2',
          question: 'ما الفرق بين أركان الإيمان وشعب الإيمان؟',
          type: 'مقارنة',
          origin: 'DEEP_LEARNING',
          parentInteractionId: id,
        },
      ],
      journeyState: {
        totalInteractions: 1,
        verifiedCount: 1,
        assessmentEligible: false
      }
    };

    res.json({
      success: true,
      data: interaction,
    });
  } catch (error) {
    next(error);
  }
});
