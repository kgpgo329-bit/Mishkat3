import { z } from 'zod';

export const AskRequestSchema = z.object({
  sessionId: z.string().min(1, 'معرّف الجلسة مطلوب'),
  question: z.string().min(2, 'يجب أن يحتوي السؤال على حرفين على الأقل').max(1000, 'تجاوز السؤال الحد الأقصى للطول'),
  category: z.string().optional(),
  origin: z.enum(['USER', 'DEEP_LEARNING'], {
    required_error: 'مصدر السؤال مطلوب',
  }),
  parentInteractionId: z.string().optional(),
});

export const QuestionUnderstandingResultSchema = z.object({
  originalQuestion: z.string(),
  normalizedQuestion: z.string(),
  category: z.string(),
  task: z.string(),
  topic: z.string(),
  userGoal: z.string(),
  claims: z.array(z.string()),
  requestedEvidence: z.array(z.string()),
  needsClarification: z.boolean(),
  clarificationReason: z.string().optional(),
  isPersonalFatwa: z.boolean(),
});

export const EvidenceVerificationResultSchema = z.object({
  evidenceId: z.string(),
  claimId: z.string(),
  sourceId: z.string(),
  chunkId: z.string(),
  relation: z.string(),
  verificationStatus: z.enum(['SUPPORTED', 'PARTIAL', 'UNSUPPORTED', 'VERIFICATION_FAILED']),
  confidence: z.number().min(0).max(1),
});

export const SufficiencyEvaluationSchema = z.object({
  sufficiencyState: z.enum(['SUFFICIENT', 'PARTIAL', 'INSUFFICIENT']),
  claimCoverage: z.number().min(0).max(1),
  supportedClaimsCount: z.number().int().nonnegative(),
  totalClaimsCount: z.number().int().nonnegative(),
  unsupportedClaims: z.array(z.string()),
});

export const AssessmentSubmissionSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0)),
});

export const TrustedSourceSchema = z.object({
  sourceId: z.string(),
  name: z.string(),
  author: z.string(),
  era: z.string().optional(),
  category: z.string(),
  description: z.string(),
  officialUrl: z.string().url().optional(),
  isVerified: z.boolean(),
});

export const KnowledgeChunkSchema = z.object({
  chunkId: z.string(),
  sourceId: z.string(),
  documentId: z.string(),
  text: z.string(),
  title: z.string(),
  category: z.string(),
  officialUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  contentHash: z.string(),
});
