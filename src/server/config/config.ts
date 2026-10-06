import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ override: true });

const ConfigSchema = z.object({
  port: z.coerce.number().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  gemini: z.object({
    apiKey: z.string().optional().default(''),
    model: z.string().default('gemini-flash-lite-latest'),
    embeddingModel: z.string().default('gemini-embedding-001'),
    timeoutMs: z.coerce.number().default(15000),
    maxRetries: z.coerce.number().default(2),
  }),
  firebase: z.object({
    projectId: z.string().optional().default(''),
    clientEmail: z.string().optional().default(''),
    privateKey: z.string().optional().default(''),
  }),
  policy: z.object({
    assessmentEligibilityThreshold: z.coerce.number().default(20),
    maxClaimsPerQuestion: z.coerce.number().default(5),
  }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): AppConfig {
  return ConfigSchema.parse({
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
      embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
      timeoutMs: process.env.GEMINI_REQUEST_TIMEOUT_MS || 15000,
      maxRetries: process.env.GEMINI_MAX_RETRIES || 2,
    },
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
      privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    },
    policy: {
      assessmentEligibilityThreshold: process.env.ASSESSMENT_ELIGIBILITY_THRESHOLD || 20,
      maxClaimsPerQuestion: 5,
    },
  });
}

export const config = loadConfig();
