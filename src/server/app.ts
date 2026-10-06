import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Basic security and parsing middleware
  app.use(cors());
  app.use(express.json());

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Serve static client build in production
  const clientDistPath = path.resolve(__dirname, '../../dist/client');
  app.use(express.static(clientDistPath));

  // SPA fallback for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) {
        // Fallback for development if client not yet built
        res.status(200).send('Mishkat API Server Running. Start Vite client for frontend dev mode.');
      }
    });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
