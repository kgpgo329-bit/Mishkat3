export interface CandidateChunk {
  chunkId: string;
  documentId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  content: string;
  title: string;
  category: string;
  locatorMetadata?: Record<string, unknown>;
  contentHash: string;
  lexicalScore: number;
  semanticScore: number | null;
  combinedScore: number;
}

export interface ClaimRetrievalResult {
  claimId: string;
  claim: string;
  candidates: CandidateChunk[];
}

export interface QuestionRetrievalResult {
  question: string;
  normalizedQuestion?: string;
  claimResults: ClaimRetrievalResult[];
  allCandidates: CandidateChunk[];
  retrievalMode: 'HYBRID' | 'LEXICAL_ONLY';
  embeddingModel?: string;
}
