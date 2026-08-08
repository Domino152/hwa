import { KnowledgeBase, type IKnowledgeBase, type KnowledgeCategory } from '../../database/models/KnowledgeBase.js';
import type { PublicInformationResult, CategoryCount } from '../types.js';
import { NotFoundError } from '../../shared/utils/errors.js';

type PublicContentCategory = KnowledgeCategory;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  campus_info: ['about hits', 'tell me about', 'college info', 'college information', 'about college', 'what is hits', 'university info'],
  academic: ['admission', 'admissions', 'how to apply', 'eligibility', 'admission process', 'apply for', 'join', 'department', 'departments', 'cse', 'ece', 'mechanical', 'civil', 'it department', 'dept'],
  courses: ['course', 'courses', 'btech', 'b.tech', 'mtech', 'm.tech', 'programs', 'programmes', 'degree'],
  placements: ['placement', 'placements', 'recruitment', 'package', 'salary', 'job', 'hiring', 'company visit'],
  hostel: ['hostel', 'hostels', 'accommodation', 'boarding', 'residence', 'room'],
  fees: ['scholarship', 'scholarships', 'financial aid', 'fee waiver', 'bursary', 'funding', 'fee', 'fees'],
  library: ['library', 'books', 'reading room', 'bibliography', 'journal'],
  events: ['event', 'events', 'fest', 'workshop', 'seminar', 'conference', 'symposium', 'celebration'],
  faqs: ['faq', 'frequently asked', 'common question', 'doubt', 'query'],
  rules: ['bus', 'transport', 'transportation', 'route', 'shuttle', 'commute', 'sport', 'sports', 'gym', 'cricket', 'football', 'basketball', 'tennis', 'athletics', 'swimming'],
  guidelines: ['contact', 'phone', 'email', 'address', 'reach us', 'get in touch', 'helpline', 'campus map', 'map', 'direction', 'where is', 'find us', 'campus location', 'how to reach', 'location'],
};

function toPublicContentData(doc: IKnowledgeBase) {
  return {
    id: doc._id.toString(),
    category: doc.category,
    title: doc.title,
    content: doc.content,
    keywords: doc.keywords,
    updatedAt: doc.updatedAt,
  };
}

export class PublicInformationService {
  resolveCategory(text: string): PublicContentCategory {
    const normalized = text.toLowerCase().trim();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (regex.test(normalized)) {
          return category as PublicContentCategory;
        }
      }
    }

    return 'campus_info';
  }

  async getById(id: string) {
    return KnowledgeBase.findById(id);
  }

  async getAll(isActive?: boolean) {
    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) filter.isActive = isActive;
    return KnowledgeBase.find(filter).sort({ priority: -1 });
  }

  async getByCategory(category: PublicContentCategory): Promise<PublicInformationResult> {
    const entries = await KnowledgeBase.find({ category, isActive: true }).sort({ priority: -1 }) as unknown as IKnowledgeBase[];

    if (entries.length === 0) {
      return { entries: [], category, hasData: false };
    }

    return { entries: entries.map(toPublicContentData), category, hasData: true };
  }

  async search(query: string): Promise<PublicInformationResult> {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (terms.length === 0) {
      return { entries: [], category: 'campus_info' as PublicContentCategory, hasData: false };
    }

    const entries = await KnowledgeBase.find({
      isActive: true,
      $or: terms.map((term) => ({
        $or: [
          { keywords: { $in: [new RegExp(term, 'i')] } },
          { synonyms: { $in: [new RegExp(term, 'i')] } },
          { title: new RegExp(term, 'i') },
          { content: new RegExp(term, 'i') },
        ],
      })),
    })
      .sort({ priority: -1 })
      .limit(5) as unknown as IKnowledgeBase[];

    if (entries.length === 0) {
      return { entries: [], category: 'campus_info' as PublicContentCategory, hasData: false };
    }

    return {
      entries: entries.map(toPublicContentData),
      category: entries[0]!.category as PublicContentCategory,
      hasData: true,
    };
  }

  async getCategoryCounts(): Promise<CategoryCount[]> {
    const counts = await KnowledgeBase.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((c) => [c._id, c.count]));

    const allCategories: KnowledgeCategory[] = [
      'campus_info', 'academic', 'fees', 'exam_results', 'hostel',
      'library', 'placements', 'events', 'rules', 'guidelines',
      'procedures', 'faqs', 'courses', 'faculty',
    ];

    return allCategories.map((cat) => ({
      category: cat,
      count: countMap.get(cat) ?? 0,
    }));
  }

  async create(data: { category: PublicContentCategory; title: string; content: string; keywords?: string[]; isActive?: boolean }) {
    return KnowledgeBase.create({
      category: data.category,
      title: data.title,
      content: data.content,
      keywords: data.keywords ?? [],
      synonyms: [],
      examples: [],
      responseTemplates: [],
      embedding: [],
      priority: 0,
      isActive: data.isActive ?? true,
    });
  }

  async update(id: string, data: Partial<{ category: PublicContentCategory; title: string; content: string; keywords: string[]; isActive: boolean }>) {
    const updated = await KnowledgeBase.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!updated) throw new NotFoundError('KnowledgeBase');
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await KnowledgeBase.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundError('KnowledgeBase');
    return true;
  }
}
