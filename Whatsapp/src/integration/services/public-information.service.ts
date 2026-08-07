import type { IPublicContentRepository } from '../../repositories/public-content.repository.js';
import type { PublicContentRecord } from '../../repositories/types.js';
import { type PublicContentCategory, PUBLIC_CONTENT_CATEGORIES } from '../../database/models/PublicContent.js';
import type { PublicInformationResult, CategoryCount } from '../types.js';
import { NotFoundError } from '../../shared/utils/errors.js';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  about_hits: ['about hits', 'tell me about', 'college info', 'college information', 'about college', 'what is hits', 'university info'],
  admissions: ['admission', 'admissions', 'how to apply', 'eligibility', 'admission process', 'apply for', 'join'],
  departments: ['department', 'departments', 'cse', 'ece', 'mechanical', 'civil', 'it department', 'dept'],
  courses: ['course', 'courses', 'btech', 'b.tech', 'mtech', 'm.tech', 'programs', 'programmes', 'degree'],
  placements: ['placement', 'placements', 'recruitment', 'package', 'salary', 'job', 'hiring', 'company visit'],
  hostel: ['hostel', 'hostels', 'accommodation', 'boarding', 'residence', 'room'],
  transportation: ['bus', 'transport', 'transportation', 'route', 'shuttle', 'commute'],
  scholarships: ['scholarship', 'scholarships', 'financial aid', 'fee waiver', 'bursary', 'funding'],
  sports: ['sport', 'sports', 'gym', 'cricket', 'football', 'basketball', 'tennis', 'athletics', 'swimming'],
  library: ['library', 'books', 'reading room', 'bibliography', 'journal'],
  events: ['event', 'events', 'fest', 'workshop', 'seminar', 'conference', 'symposium', 'celebration'],
  contact: ['contact', 'phone', 'email', 'address', 'reach us', 'get in touch', 'helpline'],
  campus_map: ['campus map', 'map', 'direction', 'where is', 'find us', 'campus location', 'how to reach', 'location'],
  faq: ['faq', 'frequently asked', 'common question', 'doubt', 'query'],
};

export class PublicInformationService {
  constructor(private readonly repo: IPublicContentRepository) {}

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

    return 'about_hits';
  }

  async getById(id: string): Promise<PublicContentRecord | null> {
    return this.repo.findById(id);
  }

  async getAll(isActive?: boolean): Promise<PublicContentRecord[]> {
    return this.repo.findAll(isActive);
  }

  async getByCategory(category: PublicContentCategory): Promise<PublicInformationResult> {
    const entries = await this.repo.findByCategory(category, true);

    if (entries.length === 0) {
      return { entries: [], category, hasData: false };
    }

    return { entries, category, hasData: true };
  }

  async search(query: string): Promise<PublicInformationResult> {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (terms.length === 0) {
      return { entries: [], category: 'about_hits', hasData: false };
    }

    const entries = await this.repo.searchByTerms(terms, 5);

    if (entries.length === 0) {
      return { entries: [], category: 'about_hits', hasData: false };
    }

    return {
      entries,
      category: entries[0]!.category,
      hasData: true,
    };
  }

  async getCategoryCounts(): Promise<CategoryCount[]> {
    const counts = await this.repo.aggregateCategoryCounts();

    const countMap = new Map(counts.map((c) => [c.category, c.count]));

    return PUBLIC_CONTENT_CATEGORIES.map((cat) => ({
      category: cat,
      count: countMap.get(cat) ?? 0,
    }));
  }

  async create(data: { category: PublicContentCategory; title: string; content: string; keywords?: string[]; isActive?: boolean }): Promise<PublicContentRecord> {
    return this.repo.create({
      category: data.category,
      title: data.title,
      content: data.content,
      keywords: data.keywords ?? [],
      isActive: data.isActive ?? true,
      createdAt: new Date(),
    });
  }

  async update(id: string, data: Partial<Omit<PublicContentRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PublicContentRecord> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError('PublicContent');
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError('PublicContent');
    return true;
  }
}
