import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicInformationService } from '../../src/integration/services/public-information.service.js';
import { classifyIntent } from '../../src/chatbot/intentClassifier.js';
import { IntentName } from '../../src/chatbot/intents.js';

vi.mock('../../src/database/models/PublicContent.js', () => {
  return {
    PublicContent: {
      find: vi.fn().mockReturnThis(),
      aggregate: vi.fn().mockResolvedValue([]),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    },
    PUBLIC_CONTENT_CATEGORIES: [
      'about_hits', 'admissions', 'departments', 'courses', 'placements',
      'hostel', 'transportation', 'scholarships', 'campus_facilities',
      'library', 'sports', 'clubs', 'events', 'contact', 'location',
      'achievements', 'faq',
    ],
  };
});

vi.mock('../../src/integration/index.js', () => ({
  integration: {
    findUserByPhone: vi.fn().mockResolvedValue(null),
    attendance: { getByStudentId: vi.fn().mockResolvedValue({ records: [], overallPercentage: 0, hasData: false }) },
    fees: { getByStudentId: vi.fn().mockResolvedValue({ fee: null, hasData: false }) },
    schedule: { getByStudent: vi.fn().mockResolvedValue({ entries: [], dayOfWeek: 'Monday', hasData: false }) },
    results: { getByStudentId: vi.fn().mockResolvedValue({ results: [], cgpa: 0, hasData: false }) },
    publicInformation: {
      resolveCategory: vi.fn().mockReturnValue('about_hits'),
      getByCategory: vi.fn().mockResolvedValue({ entries: [], category: 'about_hits', hasData: false }),
      search: vi.fn().mockResolvedValue({ entries: [], category: 'about_hits', hasData: false }),
      getCategoryCounts: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { PublicContent } from '../../src/database/models/PublicContent.js';
import { integration } from '../../src/integration/index.js';

const mockContent = {
  _id: 'content123',
  category: 'about_hits',
  title: 'HITS Overview',
  content: 'HITS is a deemed university in Chennai.',
  keywords: ['hits', 'university', 'chennai'],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PublicInformationService', () => {
  let service: PublicInformationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PublicInformationService();
  });

  describe('resolveCategory', () => {
    it('resolves "tell me about hits" → about_hits', () => {
      expect(service.resolveCategory('tell me about hits')).toBe('about_hits');
    });

    it('resolves "placement statistics" → placements', () => {
      expect(service.resolveCategory('placement statistics')).toBe('placements');
    });

    it('resolves "bus routes" → transportation', () => {
      expect(service.resolveCategory('bus routes')).toBe('transportation');
    });

    it('resolves "hostel details" → hostel', () => {
      expect(service.resolveCategory('hostel details')).toBe('hostel');
    });

    it('resolves "what courses are available" → courses', () => {
      expect(service.resolveCategory('what courses are available')).toBe('courses');
    });

    it('resolves "admission process" → admissions', () => {
      expect(service.resolveCategory('admission process')).toBe('admissions');
    });

    it('resolves "scholarship info" → scholarships', () => {
      expect(service.resolveCategory('scholarship info')).toBe('scholarships');
    });

    it('resolves "library hours" → library', () => {
      expect(service.resolveCategory('library hours')).toBe('library');
    });

    it('resolves "sports facilities" → sports', () => {
      expect(service.resolveCategory('sports facilities')).toBe('sports');
    });

    it('resolves "student clubs" → clubs', () => {
      expect(service.resolveCategory('student clubs')).toBe('clubs');
    });

    it('resolves "annual events" → events', () => {
      expect(service.resolveCategory('annual events')).toBe('events');
    });

    it('resolves "contact number" → contact', () => {
      expect(service.resolveCategory('contact number')).toBe('contact');
    });

    it('resolves "campus location" → location', () => {
      expect(service.resolveCategory('campus location')).toBe('location');
    });

    it('resolves "naac ranking" → achievements', () => {
      expect(service.resolveCategory('naac ranking')).toBe('achievements');
    });

    it('resolves "faq" → faq', () => {
      expect(service.resolveCategory('faq')).toBe('faq');
    });

    it('resolves "department of cse" → departments', () => {
      expect(service.resolveCategory('department of cse')).toBe('departments');
    });

    it('defaults to about_hits for unrecognized text', () => {
      expect(service.resolveCategory('random unrelated text')).toBe('about_hits');
    });
  });

  describe('getByCategory', () => {
    it('returns content for a valid category', async () => {
      vi.mocked(PublicContent.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockContent]),
      } as any);

      const result = await service.getByCategory('about_hits');

      expect(result.hasData).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].title).toBe('HITS Overview');
      expect(result.entries[0].category).toBe('about_hits');
    });

    it('returns hasData false for empty category', async () => {
      vi.mocked(PublicContent.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await service.getByCategory('about_hits');

      expect(result.hasData).toBe(false);
      expect(result.entries).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('searches across all content by keyword', async () => {
      vi.mocked(PublicContent.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockContent]),
        }),
      } as any);

      const result = await service.search('hits university');

      expect(result.hasData).toBe(true);
      expect(result.entries).toHaveLength(1);
    });

    it('returns hasData false when no results found', async () => {
      vi.mocked(PublicContent.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.search('xyznonexistent');

      expect(result.hasData).toBe(false);
    });
  });

  describe('getCategoryCounts', () => {
    it('returns categories with content counts', async () => {
      vi.mocked(PublicContent.aggregate).mockResolvedValue([
        { _id: 'about_hits', count: 1 },
        { _id: 'departments', count: 3 },
      ]);

      const result = await service.getCategoryCounts();

      expect(result).toHaveLength(17);
      expect(result.find((c) => c.category === 'about_hits')?.count).toBe(1);
      expect(result.find((c) => c.category === 'departments')?.count).toBe(3);
      expect(result.find((c) => c.category === 'sports')?.count).toBe(0);
    });
  });
});

describe('Intent Classifier - PublicInformation', () => {
  it('classifies "Tell me about HITS" → PublicInformation', () => {
    expect(classifyIntent('Tell me about HITS')).toBe(IntentName.PublicInformation);
  });

  it('classifies "What courses are available?" → PublicInformation', () => {
    expect(classifyIntent('What courses are available?')).toBe(IntentName.PublicInformation);
  });

  it('classifies "Placement statistics" → PublicInformation', () => {
    expect(classifyIntent('Placement statistics')).toBe(IntentName.PublicInformation);
  });

  it('classifies "Hostel details" → PublicInformation', () => {
    expect(classifyIntent('Hostel details')).toBe(IntentName.PublicInformation);
  });

  it('classifies "Bus routes" → PublicInformation', () => {
    expect(classifyIntent('Bus routes')).toBe(IntentName.PublicInformation);
  });

  it('classifies "Scholarship info" → PublicInformation', () => {
    expect(classifyIntent('Scholarship info')).toBe(IntentName.PublicInformation);
  });

  it('classifies "Contact number" → PublicInformation', () => {
    expect(classifyIntent('Contact number')).toBe(IntentName.PublicInformation);
  });

  it('classifies "Library hours" → PublicInformation', () => {
    expect(classifyIntent('Library hours')).toBe(IntentName.PublicInformation);
  });

  it('classifies "NAAC ranking" → PublicInformation', () => {
    expect(classifyIntent('NAAC ranking')).toBe(IntentName.PublicInformation);
  });

  it('classifies "Student clubs" → PublicInformation', () => {
    expect(classifyIntent('Student clubs')).toBe(IntentName.PublicInformation);
  });

  it('classifies "Admission process" → PublicInformation', () => {
    expect(classifyIntent('Admission process')).toBe(IntentName.PublicInformation);
  });

  it('classifies "Campus facilities" → PublicInformation', () => {
    expect(classifyIntent('Campus facilities')).toBe(IntentName.PublicInformation);
  });

  it('does NOT conflict with private intents', () => {
    expect(classifyIntent('Show my attendance')).toBe(IntentName.Attendance);
    expect(classifyIntent('Fee details')).toBe(IntentName.Fees);
    expect(classifyIntent('Today schedule')).toBe(IntentName.Schedule);
    expect(classifyIntent('Exam results')).toBe(IntentName.Results);
  });

  it('does NOT conflict with other public intents', () => {
    expect(classifyIntent('Hi')).toBe(IntentName.Greeting);
    expect(classifyIntent('Help')).toBe(IntentName.Help);
    expect(classifyIntent('Login')).toBe(IntentName.Login);
  });
});

describe('PublicInformation is NOT in PRIVATE_INTENTS', () => {
  it('PublicInformation is a public intent (no auth required)', async () => {
    const { PRIVATE_INTENTS } = await import('../../src/chatbot/intents.js');
    expect(PRIVATE_INTENTS).not.toContain(IntentName.PublicInformation);
  });
});
