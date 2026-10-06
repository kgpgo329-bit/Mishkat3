import { TrustedSource } from '../../shared/types/index.js';

export interface ITrustedSourceRepository {
  getAllSources(): Promise<TrustedSource[]>;
  getSourceById(sourceId: string): Promise<TrustedSource | null>;
  getSourcesByCategory(category: string): Promise<TrustedSource[]>;
  addSource(source: TrustedSource): Promise<void>;
}
