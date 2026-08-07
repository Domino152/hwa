import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicInformationService } from '../../src/integration/services/public-information.service.js';
import { classifyIntent } from '../../src/chatbot/intentClassifier.js';
import { IntentName } from '../../src/chatbot/intents.js';

vi.mock('../../src/database/models/PublicContent.js', () => ({
  PUBLIC_CONTENT_CATEGORIES: [
    'about_hits', 'admissions', 'departments', 'courses', 'placements',
    'hostel', 'transportation', 'scholarships', 'library', 'sports',
    'events', 'contact', 'campus_map', 'faq',
  ],
}));

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

import { integration } from '../../src/integration/index.js';
import type { IPublicContentRepository } from '../../src/repositories/public-content.repository.js';

const mockRepo: IPublicContentRepository = {
  findById: vi.fn(),
  findByCategory: vi.fn(),
  findAll: vi.fn(),
  searchByTerms: vi.fn(),
  aggregateCategoryCounts: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockContent = {
  id: 'content123',
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
    service = new PublicInformationService(mockRepo);
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

    it('resolves "annual events" → events', () => {
      expect(service.resolveCategory('annual events')).toBe('events');
    });

    it('resolves "contact number" → contact', () => {
      expect(service.resolveCategory('contact number')).toBe('contact');
    });

    it('resolves "campus location" → campus_map', () => {
      expect(service.resolveCategory('campus location')).toBe('campus_map');
    });

    it('resolves "naac ranking" → about_hits (default)', () => {
      expect(service.resolveCategory('naac ranking')).toBe('about_hits');
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
      vi.mocked(mockRepo.findByCategory).mockResolvedValue([mockContent]);

      const result = await service.getByCategory('about_hits');

      expect(result.hasData).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].title).toBe('HITS Overview');
      expect(result.entries[0].category).toBe('about_hits');
      expect(mockRepo.findByCategory).toHaveBeenCalledWith('about_hits', true);
    });

    it('returns hasData false for empty category', async () => {
      vi.mocked(mockRepo.findByCategory).mockResolvedValue([]);

      const result = await service.getByCategory('about_hits');

      expect(result.hasData).toBe(false);
      expect(result.entries).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('searches across all content by keyword', async () => {
      vi.mocked(mockRepo.searchByTerms).mockResolvedValue([mockContent]);

      const result = await service.search('hits university');

      expect(result.hasData).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(mockRepo.searchByTerms).toHaveBeenCalledWith(['hits', 'university'], 5);
    });

    it('returns hasData false when no results found', async () => {
      vi.mocked(mockRepo.searchByTerms).mockResolvedValue([]);

      const result = await service.search('xyznonexistent');

      expect(result.hasData).toBe(false);
    });
  });

  describe('getCategoryCounts', () => {
    it('returns categories with content counts', async () => {
      vi.mocked(mockRepo.aggregateCategoryCounts).mockResolvedValue([
        { category: 'about_hits', count: 1 },
        { category: 'departments', count: 3 },
      ]);

      const result = await service.getCategoryCounts();

      expect(result).toHaveLength(14);
      expect(result.find((c) => c.category === 'about_hits')?.count).toBe(1);
      expect(result.find((c) => c.category === 'departments')?.count).toBe(3);
      expect(result.find((c) => c.category === 'sports')?.count).toBe(0);
    });
  });

  describe('getById', () => {
    it('returns an entry by id', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockContent);

      const result = await service.getById('content123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('content123');
      expect(result!.title).toBe('HITS Overview');
      expect(mockRepo.findById).toHaveBeenCalledWith('content123');
    });

    it('returns null for non-existent id', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('returns all entries', async () => {
      vi.mocked(mockRepo.findAll).mockResolvedValue([mockContent]);

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(mockRepo.findAll).toHaveBeenCalledWith(undefined);
    });

    it('filters by isActive', async () => {
      vi.mocked(mockRepo.findAll).mockResolvedValue([mockContent]);

      const result = await service.getAll(true);

      expect(result).toHaveLength(1);
      expect(mockRepo.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('create', () => {
    it('creates a new entry', async () => {
      const newEntry = { ...mockContent, id: 'new123', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(mockRepo.create).mockResolvedValue(newEntry);

      const result = await service.create({
        category: 'about_hits',
        title: 'HITS Overview',
        content: 'HITS is a deemed university.',
        keywords: ['hits'],
      });

      expect(result.id).toBe('new123');
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('defaults isActive to true', async () => {
      const newEntry = { ...mockContent, isActive: true, createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(mockRepo.create).mockResolvedValue(newEntry);

      const result = await service.create({
        category: 'about_hits',
        title: 'Test',
        content: 'Test content',
      });

      expect(result.isActive).toBe(true);
    });
  });

  describe('update', () => {
    it('updates an existing entry', async () => {
      const updated = { ...mockContent, title: 'Updated Title' };
      vi.mocked(mockRepo.update).mockResolvedValue(updated);

      const result = await service.update('content123', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
      expect(mockRepo.update).toHaveBeenCalledWith('content123', { title: 'Updated Title' });
    });

    it('throws NotFoundError for non-existent id', async () => {
      vi.mocked(mockRepo.update).mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'Test' })).rejects.toThrow('PublicContent');
    });
  });

  describe('delete', () => {
    it('deletes an entry', async () => {
      vi.mocked(mockRepo.delete).mockResolvedValue(true);

      const result = await service.delete('content123');

      expect(result).toBe(true);
      expect(mockRepo.delete).toHaveBeenCalledWith('content123');
    });

    it('throws NotFoundError for non-existent id', async () => {
      vi.mocked(mockRepo.delete).mockResolvedValue(false);

      await expect(service.delete('nonexistent')).rejects.toThrow('PublicContent');
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
