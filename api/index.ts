import { createApp } from '../src/server/app.js';

const app = createApp();

export default function handler(req: any, res: any) {
  // Recover original path if rewritten by Vercel
  const matchedPath = (req.headers?.['x-matched-path'] || req.headers?.['x-forwarded-uri']) as string | undefined;
  if (matchedPath && matchedPath.startsWith('/api')) {
    req.url = matchedPath;
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
}
