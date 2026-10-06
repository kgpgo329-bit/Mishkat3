import { Router } from 'express';
import { askRouter } from './ask.route.js';
import { interactionsRouter } from './interactions.route.js';
import { deepLearningRouter } from './deepLearning.route.js';
import { journeyRouter } from './journey.route.js';
import { assessmentRouter } from './assessment.route.js';
import { reportRouter } from './report.route.js';
import { sourcesRouter } from './sources.route.js';
import { specialistRouter } from './specialist.route.js';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Mishkat Islamic UI Platform MVP',
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Mishkat Islamic UI Platform MVP',
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use('/ask', askRouter);
apiRouter.use('/interactions', interactionsRouter);
apiRouter.use('/deep-learning', deepLearningRouter);
apiRouter.use('/journey', journeyRouter);
apiRouter.use('/assessment', assessmentRouter);
apiRouter.use('/report', reportRouter);
apiRouter.use('/sources', sourcesRouter);
apiRouter.use('/specialist', specialistRouter);
