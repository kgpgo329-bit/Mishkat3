import crypto from 'crypto';
import { normalizeForHash } from './cleaner.js';

/**
 * Generates a deterministic SHA-256 content hash for chunk deduplication.
 */
export function generateContentHash(text: string): string {
  const normalized = normalizeForHash(text);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
