import type { PublicContentRecord, CategoryCountRecord } from './types.js';

export interface IPublicContentRepository {
  findById(id: string): Promise<PublicContentRecord | null>;
  findByCategory(category: string, isActive: boolean): Promise<PublicContentRecord[]>;
  findAll(isActive?: boolean): Promise<PublicContentRecord[]>;
  searchByTerms(terms: string[], limit: number): Promise<PublicContentRecord[]>;
  aggregateCategoryCounts(): Promise<CategoryCountRecord[]>;
  create(data: Omit<PublicContentRecord, 'id' | 'updatedAt'>): Promise<PublicContentRecord>;
  update(id: string, data: Partial<Omit<PublicContentRecord, 'id' | 'updatedAt'>>): Promise<PublicContentRecord | null>;
  delete(id: string): Promise<boolean>;
}
