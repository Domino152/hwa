import { PublicContent, type IPublicContent, type PublicContentCategory, PUBLIC_CONTENT_CATEGORIES } from '../../database/models/PublicContent.js';
import type { PublicContentData, PublicInformationResult, CategoryCount } from '../types.js';

const CATEGORY_KEYWORDS: Record<PublicContentCategory, string[]> = {
  about_hits: ['about hits', 'tell me about', 'college info', 'college information', 'about college', 'what is hits', 'university info'],
  admissions: ['admission', 'admissions', 'how to apply', 'eligibility', 'admission process', 'apply for', 'join'],
  departments: ['department', 'departments', 'cse', 'ece', 'mechanical', 'civil', 'it department', 'dept'],
  courses: ['course', 'courses', 'btech', 'b.tech', 'mtech', 'm.tech', 'programs', 'programmes', 'degree'],
  placements: ['placement', 'placements', 'recruitment', 'package', 'salary', 'job', 'hiring', 'company visit'],
  hostel: ['hostel', 'hostels', 'accommodation', 'boarding', 'residence', 'room'],
  transportation: ['bus', 'transport', 'transportation', 'route', 'shuttle', 'commute'],
  scholarships: ['scholarship', 'scholarships', 'financial aid', 'fee waiver', 'bursary', 'funding'],
  sports: ['sport', 'sports', 'gym', 'cricket', 'football', 'basketball', 'tennis', 'athletics', 'swimming'],
  campus_facilities: ['facility', 'facilities', 'infrastructure', 'building', 'lab', 'laboratory'],
  library: ['library', 'books', 'reading room', 'bibliography', 'journal'],
  clubs: ['club', 'clubs', 'society', 'societies', 'association', 'student club', 'technical club'],
  events: ['event', 'events', 'fest', 'workshop', 'seminar', 'conference', 'symposium', 'celebration'],
  contact: ['contact', 'phone', 'email', 'address', 'reach us', 'get in touch', 'helpline'],
  location: ['location', 'map', 'direction', 'where is', 'find us', 'campus location', 'how to reach'],
  achievements: ['achievement', 'achievements', 'award', 'ranking', 'accreditation', 'recognition', 'naac'],
  faq: ['faq', 'frequently asked', 'common question', 'doubt', 'query'],
};

function toPlainData(doc: IPublicContent): PublicContentData {
  return {
    id: String(doc._id),
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

    return 'about_hits';
  }

  async getByCategory(category: PublicContentCategory): Promise<PublicInformationResult> {
    const docs = await PublicContent.find({ category, isActive: true }).sort({ title: 1 });

    if (docs.length === 0) {
      return { entries: [], category, hasData: false };
    }

    return {
      entries: docs.map(toPlainData),
      category,
      hasData: true,
    };
  }

  async search(query: string): Promise<PublicInformationResult> {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (terms.length === 0) {
      return { entries: [], category: 'about_hits', hasData: false };
    }

    const regex = new RegExp(terms.join('|'), 'i');

    const docs = await PublicContent.find({
      isActive: true,
      $or: [
        { title: regex },
        { content: regex },
        { keywords: { $in: terms } },
      ],
    }).sort({ title: 1 }).limit(5);

    if (docs.length === 0) {
      return { entries: [], category: 'about_hits', hasData: false };
    }

    return {
      entries: docs.map(toPlainData),
      category: docs[0]!.category,
      hasData: true,
    };
  }

  async getCategoryCounts(): Promise<CategoryCount[]> {
    const results = await PublicContent.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const countMap = new Map(results.map((r) => [r._id, r.count]));

    return PUBLIC_CONTENT_CATEGORIES.map((cat) => ({
      category: cat,
      count: countMap.get(cat) ?? 0,
    }));
  }
}
