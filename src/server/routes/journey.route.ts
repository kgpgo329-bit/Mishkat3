import { Router, Request, Response, NextFunction } from 'express';
import { JourneyDashboardData } from '../../shared/types/index.js';
import { config } from '../config/config.js';

import { KnowledgeJourneyService } from '../journey/knowledgeJourneyService.js';

export const journeyRouter = Router();

const journeyService = new KnowledgeJourneyService();

journeyRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = (req.query.sessionId as string) || 'default_session';
    const journeyData = await journeyService.getJourney(sessionId);

    res.json({
      success: true,
      data: journeyData,
    });
  } catch (error) {
    next(error);
  }
});
