import { Router, Request, Response, NextFunction } from 'express';
import { ReportService } from '../report/reportService.js';

export const reportRouter = Router();

const reportService = new ReportService();

reportRouter.get('/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = (req.query.sessionId as string) || 'default_session';
    const status = await reportService.getStatus(sessionId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = (req.query.sessionId as string) || 'default_session';
    const report = await reportService.getReport(sessionId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

reportRouter.post('/generate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = (req.body.sessionId as string) || 'default_session';
    const report = await reportService.generateReport(sessionId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});
