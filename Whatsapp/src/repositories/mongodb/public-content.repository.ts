import { PublicContent } from '../../database/models/PublicContent.js';
import type { IPublicContentRepository } from '../public-content.repository.js';
import type { PublicContentRecord, CategoryCountRecord } from '../types.js';

function toPlainData(doc: { _id: unknown; category: string; title: string; content: string; keywords: string[]; isActive: boolean; createdAt: Date; updatedAt: Date }): PublicContentRecord {
  return {
    id: String(doc._id),
    category: doc.category,
    title: doc.title,
    content: doc.content,
    keywords: doc.keywords,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoPublicContentRepository implements IPublicContentRepository {
  async findById(id: string): Promise<PublicContentRecord | null> {
    const doc = await PublicContent.findById(id);
    return doc ? toPlainData(doc) : null;
  }

  async findByCategory(category: string, isActive: boolean): Promise<PublicContentRecord[]> {
    const docs = await PublicContent.find({ category, isActive }).sort({ title: 1 });
    return docs.map(toPlainData);
  }

  async findAll(isActive?: boolean): Promise<PublicContentRecord[]> {
    const query: Record<string, unknown> = {};
    if (isActive !== undefined) query.isActive = isActive;
    const docs = await PublicContent.find(query).sort({ category: 1, title: 1 });
    return docs.map(toPlainData);
  }

  async searchByTerms(terms: string[], limit: number): Promise<PublicContentRecord[]> {
    if (terms.length === 0) return [];

    const regex = new RegExp(terms.join('|'), 'i');

    const docs = await PublicContent.find({
      isActive: true,
      $or: [
        { title: regex },
        { content: regex },
        { keywords: { $in: terms } },
      ],
    }).sort({ title: 1 }).limit(limit);

    return docs.map(toPlainData);
  }

  async aggregateCategoryCounts(): Promise<CategoryCountRecord[]> {
    const results = await PublicContent.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return results.map((r) => ({
      category: r._id as string,
      count: r.count as number,
    }));
  }

  async create(data: Omit<PublicContentRecord, 'id' | 'updatedAt'>): Promise<PublicContentRecord> {
    const doc = await PublicContent.create(data);
    return toPlainData(doc);
  }

  async update(id: string, data: Partial<Omit<PublicContentRecord, 'id' | 'updatedAt'>>): Promise<PublicContentRecord | null> {
    const doc = await PublicContent.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toPlainData(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await PublicContent.findByIdAndDelete(id);
    return !!result;
  }
}
