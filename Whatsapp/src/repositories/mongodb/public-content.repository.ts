import { PublicContent } from '../../database/models/PublicContent.js';
import type { IPublicContentRepository } from '../public-content.repository.js';
import type { PublicContentRecord, CategoryCountRecord } from '../types.js';

function toPlainData(doc: { _id: unknown; category: string; title: string; content: string; keywords: string[]; updatedAt: Date }): PublicContentRecord {
  return {
    id: String(doc._id),
    category: doc.category,
    title: doc.title,
    content: doc.content,
    keywords: doc.keywords,
    updatedAt: doc.updatedAt,
  };
}

export class MongoPublicContentRepository implements IPublicContentRepository {
  async findByCategory(category: string, isActive: boolean): Promise<PublicContentRecord[]> {
    const docs = await PublicContent.find({ category, isActive }).sort({ title: 1 });
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
}
