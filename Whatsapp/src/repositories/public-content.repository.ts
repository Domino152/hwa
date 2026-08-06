import type { PublicContentRecord, CategoryCountRecord } from './types.js';

export interface IPublicContentRepository {
  findByCategory(category: string, isActive: boolean): Promise<PublicContentRecord[]>;
  searchByTerms(terms: string[], limit: number): Promise<PublicContentRecord[]>;
  aggregateCategoryCounts(): Promise<CategoryCountRecord[]>;
}
