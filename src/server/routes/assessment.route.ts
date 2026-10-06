import { Router, Request, Response, NextFunction } from 'express';
import { AssessmentSubmissionSchema } from '../../shared/schemas/index.js';
import {
  AssessmentEligibilityInfo,
  AssessmentClientView,
  AssessmentSubmissionResult
} from '../../shared/types/index.js';
import { config } from '../config/config.js';
import { MishkatError } from '../../shared/errors/MishkatError.js';

import { AssessmentService } from '../assessment/assessmentService.js';

export const assessmentRouter = Router();

const assessmentService = new AssessmentService();

assessmentRouter.get('/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = (req.query.sessionId as string) || 'default_session';
    const statusInfo = await assessmentService.getStatus(sessionId);

    res.json({
      success: true,
      data: statusInfo,
    });
  } catch (error) {
    next(error);
  }
});

assessmentRouter.post('/generate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = (req.body.sessionId as string) || 'default_session';
    const clientView = await assessmentService.generateAssessment(sessionId);

    res.json({
      success: true,
      data: clientView,
    });
  } catch (error) {
    next(error);
  }
});

assessmentRouter.post('/:id/submit', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id) {
      throw MishkatError.badRequest('معرّف التقييم مطلوب');
    }

    const validated = AssessmentSubmissionSchema.parse(req.body);
    const result = await assessmentService.submitAssessment(id, validated.answers);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});
