import {
  KnowledgeChunk,
  TrustedSource,
  CandidateChunk,
  ClaimRetrievalResult,
  QuestionRetrievalResult,
} from '../../shared/types/index.js';
import { LocalJsonKnowledgeRepository } from '../repository/LocalJsonKnowledgeRepository.js';
import { BM25LexicalScorer } from './lexicalScorer.js';
import { EmbeddingService } from './embeddingService.js';

export interface HybridRetrieverOptions {
  topK?: number;
  lexicalWeight?: number;
  semanticWeight?: number;
}

export class HybridRetriever {
  private repository: LocalJsonKnowledgeRepository;
  private embeddingService: EmbeddingService;
  private lexicalScorer: BM25LexicalScorer;
  private sourcesCache: Map<string, TrustedSource> = new Map();

  constructor(
    repository?: LocalJsonKnowledgeRepository,
    embeddingService?: EmbeddingService,
    lexicalScorer?: BM25LexicalScorer
  ) {
    this.repository = repository || new LocalJsonKnowledgeRepository();
    this.embeddingService = embeddingService || new EmbeddingService();
    this.lexicalScorer = lexicalScorer || new BM25LexicalScorer();
  }

  private async loadSources(): Promise<void> {
    if (this.sourcesCache.size === 0) {
      const sources = await this.repository.getAllSources();
      for (const s of sources) {
        this.sourcesCache.set(s.sourceId, s);
      }
    }
  }

  private async getAllChunks(): Promise<KnowledgeChunk[]> {
    return this.repository.searchChunks({ query: '', limit: 1000 });
  }

  /**
   * Retrieves candidate chunks for a specific query text against all candidate chunks.
   */
  private async scoreAndRank(
    query: string,
    chunks: KnowledgeChunk[],
    chunkVectors: Map<string, number[]>,
    topK: number,
    lexicalWeight: number = 0.4,
    semanticWeight: number = 0.6
  ): Promise<{ candidates: CandidateChunk[]; isSemanticUsed: boolean }> {
    await this.loadSources();

    // 1. Lexical scoring
    const lexicalScores = this.lexicalScorer.scoreChunks(query, chunks);

    // 2. Semantic scoring
    let semanticScores: Map<string, number> | null = null;
    let isSemanticUsed = false;

    if (this.embeddingService.isAvailable()) {
      const queryVector = await this.embeddingService.embedText(query);
      if (queryVector && chunkVectors.size > 0) {
        semanticScores = this.embeddingService.scoreChunksWithVector(queryVector, chunkVectors);
        isSemanticUsed = true;
      }
    }

    // 3. Build candidate chunks with combined score
    const candidates: CandidateChunk[] = chunks.map((chunk) => {
      const lexScore = lexicalScores.get(chunk.chunkId) ?? 0;
      const semScore = semanticScores ? semanticScores.get(chunk.chunkId) ?? 0 : null;

      let combined: number;
      if (semScore !== null) {
        combined = Number((lexicalWeight * lexScore + semanticWeight * semScore).toFixed(4));
      } else {
        combined = lexScore;
      }

      const source = this.sourcesCache.get(chunk.sourceId);

      return {
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        sourceId: chunk.sourceId,
        sourceName: source?.name || chunk.sourceId,
        sourceUrl: chunk.officialUrl || source?.officialUrl,
        content: chunk.text,
        title: chunk.title,
        category: chunk.category,
        locatorMetadata: chunk.metadata,
        contentHash: chunk.contentHash,
        lexicalScore: lexScore,
        semanticScore: semScore,
        combinedScore: combined,
      };
    });

    // 4. Sort descending by combinedScore (tie-break on lexicalScore)
    candidates.sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) {
        return b.combinedScore - a.combinedScore;
      }
      return b.lexicalScore - a.lexicalScore;
    });

    // 5. Slice to topK
    return {
      candidates: candidates.slice(0, topK),
      isSemanticUsed,
    };
  }

  /**
   * Main retrieval method: claim-aware and top-K bounded.
   */
  async retrieve(
    params: {
      question: string;
      normalizedQuestion?: string;
      claims?: string[];
    },
    options?: HybridRetrieverOptions
  ): Promise<QuestionRetrievalResult> {
    const topK = options?.topK ?? 5;
    const lexicalWeight = options?.lexicalWeight ?? 0.4;
    const semanticWeight = options?.semanticWeight ?? 0.6;

    const chunks = await this.getAllChunks();
    const chunkVectors = await this.embeddingService.ensureChunksEmbedded(chunks);

    let semanticAnyUsed = false;
    const claimResults: ClaimRetrievalResult[] = [];

    // 1. Claim-aware retrieval if claims are present
    const claims = params.claims && params.claims.length > 0 ? params.claims : [];

    for (let i = 0; i < claims.length; i++) {
      const claimText = claims[i];
      const claimQuery = params.normalizedQuestion
        ? `${claimText} — ${params.normalizedQuestion}`
        : (params.question ? `${claimText} — ${params.question}` : claimText);

      const { candidates, isSemanticUsed } = await this.scoreAndRank(
        claimQuery,
        chunks,
        chunkVectors,
        topK,
        lexicalWeight,
        semanticWeight
      );

      if (isSemanticUsed) semanticAnyUsed = true;

      claimResults.push({
        claimId: `claim_${i + 1}`,
        claim: claimText,
        candidates,
      });
    }

    // 2. Question-level retrieval
    const queryForOverall = params.normalizedQuestion || params.question;
    const { candidates: overallCandidates, isSemanticUsed } = await this.scoreAndRank(
      queryForOverall,
      chunks,
      chunkVectors,
      topK,
      lexicalWeight,
      semanticWeight
    );

    if (isSemanticUsed) semanticAnyUsed = true;

    // 3. Deduplicated combined candidates across all claims + question
    const candidateMap = new Map<string, CandidateChunk>();
    for (const c of overallCandidates) {
      candidateMap.set(c.chunkId, c);
    }
    for (const cr of claimResults) {
      for (const c of cr.candidates) {
        const existing = candidateMap.get(c.chunkId);
        if (!existing || c.combinedScore > existing.combinedScore) {
          candidateMap.set(c.chunkId, c);
        }
      }
    }

    const allCandidates = Array.from(candidateMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, topK * 2);

    return {
      question: params.question,
      normalizedQuestion: params.normalizedQuestion,
      claimResults,
      allCandidates,
      retrievalMode: semanticAnyUsed ? 'HYBRID' : 'LEXICAL_ONLY',
      embeddingModel: this.embeddingService.getModelName(),
    };
  }
}
