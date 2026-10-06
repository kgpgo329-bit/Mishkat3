import { KnowledgeChunk } from '../../shared/types/index.js';

const ARABIC_STOP_WORDS = new Set([
  'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
  'الذي', 'التي', 'الذين', 'اللاتي', 'اللواتي', 'هو', 'هي', 'هم', 'هن',
  'أنا', 'نحن', 'أنت', 'أنتم', 'كان', 'كانت', 'يكون', 'أن', 'إن', 'ما',
  'لا', 'لم', 'لن', 'هل', 'إذا', 'لو', 'ثم', 'أو', 'بل', 'لكن', 'حتى',
  'غير', 'كل', 'بعض', 'قد', 'بين', 'عند', 'فوق', 'تحت', 'أمام', 'خلف',
  'صلى', 'وسلم', 'عليه', 'عليها', 'عليهم', 'تعالى', 'سبحانه', 'عز', 'وجل', 'رضي', 'عنه', 'عنها',
]);

/**
 * Normalizes Arabic text for lexical matching.
 */
export function normalizeArabicTokens(text: string): string[] {
  if (!text) return [];

  const normalized = text
    // Strip tashkeel (diacritical marks)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize alefs
    .replace(/[أإآ]/g, 'ا')
    // Normalize yaa/alef maksura
    .replace(/ى/g, 'ي')
    // Normalize taa marbuta
    .replace(/ة/g, 'ه')
    // Strip non-letter characters
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .toLowerCase();

  return normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .map((t) => (t.startsWith('ال') && t.length > 4 ? t.substring(2) : t))
    .filter((t) => t.length > 1 && !ARABIC_STOP_WORDS.has(t));
}

export class BM25LexicalScorer {
  private k1: number;
  private b: number;

  constructor(k1: number = 1.2, b: number = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  scoreChunks(query: string, chunks: KnowledgeChunk[]): Map<string, number> {
    const scores = new Map<string, number>();
    if (!query || chunks.length === 0) {
      for (const c of chunks) scores.set(c.chunkId, 0);
      return scores;
    }

    const queryTokens = normalizeArabicTokens(query);
    if (queryTokens.length === 0) {
      for (const c of chunks) scores.set(c.chunkId, 0);
      return scores;
    }

    const N = chunks.length;
    let totalDocLen = 0;
    const docTokenMap = new Map<string, string[]>();
    const docFreq = new Map<string, number>();

    // Index chunks
    for (const chunk of chunks) {
      const fullText = `${chunk.title} ${chunk.text}`;
      const tokens = normalizeArabicTokens(fullText);
      docTokenMap.set(chunk.chunkId, tokens);
      totalDocLen += tokens.length;

      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      }
    }

    const avgdl = totalDocLen / Math.max(1, N);

    let maxScore = 0;

    for (const chunk of chunks) {
      const tokens = docTokenMap.get(chunk.chunkId) || [];
      const docLen = tokens.length;
      let rawScore = 0;

      // Count term frequencies in this document
      const termCounts = new Map<string, number>();
      for (const t of tokens) {
        termCounts.set(t, (termCounts.get(t) || 0) + 1);
      }

      for (const qToken of queryTokens) {
        const n = docFreq.get(qToken) || 0;
        if (n === 0) continue;

        // Robertson-Spärck Jones IDF
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        const tf = termCounts.get(qToken) || 0;
        const denom = tf + this.k1 * (1 - this.b + this.b * (docLen / avgdl));
        const tfComponent = (tf * (this.k1 + 1)) / (denom || 1);

        rawScore += idf * tfComponent;
      }

      // Title exact query match boost
      if (chunk.title.toLowerCase().includes(query.trim().toLowerCase())) {
        rawScore += 2.0;
      }

      if (rawScore > maxScore) {
        maxScore = rawScore;
      }

      scores.set(chunk.chunkId, rawScore);
    }

    // Normalize between 0.0 and 1.0
    for (const [chunkId, rawScore] of scores.entries()) {
      const normalizedScore = maxScore > 0 ? Math.min(1.0, rawScore / maxScore) : 0;
      scores.set(chunkId, Number(normalizedScore.toFixed(4)));
    }

    return scores;
  }
}
