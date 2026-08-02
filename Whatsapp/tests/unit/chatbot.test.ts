import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeText } from '../../src/chatbot/helpers.js';
import { classifyIntent } from '../../src/chatbot/intentClassifier.js';
import { generateResponse } from '../../src/chatbot/responseGenerator.js';
import { IntentName } from '../../src/chatbot/intents.js';
import { ChatbotService } from '../../src/chatbot/chatbot.service.js';

vi.mock('../../src/database/models/User.js', () => ({
  User: {
    findByPhone: vi.fn().mockResolvedValue(null),
  },
}));

import { User } from '../../src/database/models/User.js';

describe('Chatbot Helpers', () => {
  describe('normalizeText', () => {
    it('converts to lowercase', () => {
      expect(normalizeText('HELLO')).toBe('hello');
    });

    it('strips punctuation', () => {
      expect(normalizeText('Hello!')).toBe('hello');
      expect(normalizeText('Hi, how are you?')).toBe('hi how are you');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeText('  hi   there  ')).toBe('hi there');
    });

    it('handles empty string', () => {
      expect(normalizeText('')).toBe('');
    });

    it('handles mixed case with punctuation', () => {
      expect(normalizeText('GOOD MORNING!!')).toBe('good morning');
    });
  });
});

describe('Intent Classifier', () => {
  describe('Greeting intent', () => {
    it('classifies "Hi"', () => {
      expect(classifyIntent('Hi')).toBe(IntentName.Greeting);
    });

    it('classifies "Hello"', () => {
      expect(classifyIntent('Hello')).toBe(IntentName.Greeting);
    });

    it('classifies "hey"', () => {
      expect(classifyIntent('hey')).toBe(IntentName.Greeting);
    });

    it('classifies "good morning"', () => {
      expect(classifyIntent('good morning')).toBe(IntentName.Greeting);
    });

    it('classifies "good evening"', () => {
      expect(classifyIntent('good evening')).toBe(IntentName.Greeting);
    });

    it('classifies "HELLO!"', () => {
      expect(classifyIntent('HELLO!')).toBe(IntentName.Greeting);
    });

    it('classifies "  Hi  "', () => {
      expect(classifyIntent('  Hi  ')).toBe(IntentName.Greeting);
    });

    it('classifies "Good Morning"', () => {
      expect(classifyIntent('Good Morning')).toBe(IntentName.Greeting);
    });
  });

  describe('Attendance intent', () => {
    it('classifies "Attendance"', () => {
      expect(classifyIntent('Attendance')).toBe(IntentName.Attendance);
    });

    it('classifies "Show my attendance"', () => {
      expect(classifyIntent('Show my attendance')).toBe(IntentName.Attendance);
    });

    it('classifies "attendance percentage"', () => {
      expect(classifyIntent('attendance percentage')).toBe(IntentName.Attendance);
    });

    it('classifies "What is my attendance?"', () => {
      expect(classifyIntent('What is my attendance?')).toBe(IntentName.Attendance);
    });

    it('classifies "Am I present today"', () => {
      expect(classifyIntent('Am I present today')).toBe(IntentName.Attendance);
    });
  });

  describe('Fees intent', () => {
    it('classifies "Fee details"', () => {
      expect(classifyIntent('Fee details')).toBe(IntentName.Fees);
    });

    it('classifies "pending fee"', () => {
      expect(classifyIntent('pending fee')).toBe(IntentName.Fees);
    });

    it('classifies "What are the fees?"', () => {
      expect(classifyIntent('What are the fees?')).toBe(IntentName.Fees);
    });

    it('classifies "tuition fee"', () => {
      expect(classifyIntent('tuition fee')).toBe(IntentName.Fees);
    });
  });

  describe('Schedule intent', () => {
    it('classifies "Today\'s schedule"', () => {
      expect(classifyIntent("Today's schedule")).toBe(IntentName.Schedule);
    });

    it('classifies "today schedule"', () => {
      expect(classifyIntent('today schedule')).toBe(IntentName.Schedule);
    });

    it('classifies "timetable"', () => {
      expect(classifyIntent('timetable')).toBe(IntentName.Schedule);
    });

    it('classifies "class schedule"', () => {
      expect(classifyIntent('class schedule')).toBe(IntentName.Schedule);
    });
  });

  describe('Results intent', () => {
    it('classifies "Exam results"', () => {
      expect(classifyIntent('Exam results')).toBe(IntentName.Results);
    });

    it('classifies "semester result"', () => {
      expect(classifyIntent('semester result')).toBe(IntentName.Results);
    });

    it('classifies "marks"', () => {
      expect(classifyIntent('marks')).toBe(IntentName.Results);
    });

    it('classifies "cgpa"', () => {
      expect(classifyIntent('cgpa')).toBe(IntentName.Results);
    });
  });

  describe('Syllabus intent', () => {
    it('classifies "DBMS syllabus"', () => {
      expect(classifyIntent('DBMS syllabus')).toBe(IntentName.Syllabus);
    });

    it('classifies "syllabus"', () => {
      expect(classifyIntent('syllabus')).toBe(IntentName.Syllabus);
    });

    it('classifies "Java syllabus"', () => {
      expect(classifyIntent('Java syllabus')).toBe(IntentName.Syllabus);
    });
  });

  describe('Login intent', () => {
    it('classifies "login"', () => {
      expect(classifyIntent('login')).toBe(IntentName.Login);
    });

    it('classifies "sign in"', () => {
      expect(classifyIntent('sign in')).toBe(IntentName.Login);
    });

    it('classifies "Login"', () => {
      expect(classifyIntent('Login')).toBe(IntentName.Login);
    });

    it('classifies "i want to login"', () => {
      expect(classifyIntent('i want to login')).toBe(IntentName.Login);
    });
  });

  describe('Help intent', () => {
    it('classifies "Help"', () => {
      expect(classifyIntent('Help')).toBe(IntentName.Help);
    });

    it('classifies "menu"', () => {
      expect(classifyIntent('menu')).toBe(IntentName.Help);
    });

    it('classifies "options"', () => {
      expect(classifyIntent('options')).toBe(IntentName.Help);
    });

    it('classifies "commands"', () => {
      expect(classifyIntent('commands')).toBe(IntentName.Help);
    });
  });

  describe('Unknown intent', () => {
    it('classifies random text as unknown', () => {
      expect(classifyIntent('What is the weather today?')).toBe(IntentName.Unknown);
    });

    it('classifies empty string as unknown', () => {
      expect(classifyIntent('')).toBe(IntentName.Unknown);
    });

    it('classifies unrelated text as unknown', () => {
      expect(classifyIntent('I like pizza a lot')).toBe(IntentName.Unknown);
    });
  });

  describe('Priority: domain intents before greeting', () => {
    it('"Hi, show my attendance" → attendance', () => {
      expect(classifyIntent('Hi, show my attendance')).toBe(IntentName.Attendance);
    });

    it('"Hello, what are my fees?" → fees', () => {
      expect(classifyIntent('Hello, what are my fees?')).toBe(IntentName.Fees);
    });

    it('"Hey, show timetable" → schedule', () => {
      expect(classifyIntent('Hey, show timetable')).toBe(IntentName.Schedule);
    });
  });
});

describe('Response Generator', () => {
  const ctx = { phone: '1234567890', isAuthenticated: false };

  it('greeting response contains welcome and subject list', () => {
    const response = generateResponse(IntentName.Greeting, ctx);
    expect(response).toContain('Hello');
    expect(response).toContain('Welcome');
    expect(response).toContain('Attendance');
    expect(response).toContain('DBMS');
  });

  it('attendance response returns login prompt when not authenticated', () => {
    const response = generateResponse(IntentName.Attendance, ctx);
    expect(response).toContain('please login');
    expect(response).toContain('Click here');
  });

  it('attendance response contains attendance summary when authenticated', () => {
    const authCtx = { ...ctx, isAuthenticated: true, user: { id: '1', fullName: 'Arjun', role: 'student' as const, studentId: '22CSE001' } };
    const response = generateResponse(IntentName.Attendance, authCtx);
    expect(response).toContain('Attendance Summary');
    expect(response).toContain('82%');
  });

  it('fees response returns login prompt when not authenticated', () => {
    const response = generateResponse(IntentName.Fees, ctx);
    expect(response).toContain('please login');
  });

  it('fees response contains fee details when authenticated', () => {
    const authCtx = { ...ctx, isAuthenticated: true, user: { id: '1', fullName: 'Arjun', role: 'student' as const, studentId: '22CSE001' } };
    const response = generateResponse(IntentName.Fees, authCtx);
    expect(response).toContain('Fee Details');
    expect(response).toContain('₹1,00,000');
  });

  it('schedule response returns login prompt when not authenticated', () => {
    const response = generateResponse(IntentName.Schedule, ctx);
    expect(response).toContain('please login');
  });

  it('schedule response contains today\'s schedule when authenticated', () => {
    const authCtx = { ...ctx, isAuthenticated: true, user: { id: '1', fullName: 'Arjun', role: 'student' as const, studentId: '22CSE001' } };
    const response = generateResponse(IntentName.Schedule, authCtx);
    expect(response).toContain("Today's Schedule");
  });

  it('results response returns login prompt when not authenticated', () => {
    const response = generateResponse(IntentName.Results, ctx);
    expect(response).toContain('please login');
  });

  it('results response contains semester results when authenticated', () => {
    const authCtx = { ...ctx, isAuthenticated: true, user: { id: '1', fullName: 'Arjun', role: 'student' as const, studentId: '22CSE001' } };
    const response = generateResponse(IntentName.Results, authCtx);
    expect(response).toContain('Semester Results');
  });

  it('syllabus response contains subject list', () => {
    const response = generateResponse(IntentName.Syllabus, ctx);
    expect(response).toContain('Available Syllabus');
    expect(response).toContain('DBMS');
    expect(response).toContain('Java');
    expect(response).toContain('Operating Systems');
  });

  it('login response contains login URL', () => {
    const response = generateResponse(IntentName.Login, ctx);
    expect(response).toContain('Click here');
    expect(response).toContain('login');
  });

  it('help response contains available commands', () => {
    const response = generateResponse(IntentName.Help, ctx);
    expect(response).toContain('Available Commands');
    expect(response).toContain('Attendance');
    expect(response).toContain('Fees');
  });

  it('unknown response contains guidance', () => {
    const response = generateResponse(IntentName.Unknown, ctx);
    expect(response).toContain("couldn't understand");
    expect(response).toContain('Help');
  });
});

describe('ChatbotService', () => {
  const service = new ChatbotService();
  const mockedFindByPhone = vi.mocked(User.findByPhone);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindByPhone.mockResolvedValue(null);
  });

  it('processes "Hi" → greeting response', async () => {
    const result = await service.processMessage('Hi', { phone: '111' });
    expect(result.intent).toBe(IntentName.Greeting);
    expect(result.response).toContain('Hello');
    expect(result.originalText).toBe('Hi');
  });

  it('processes "Login" → login response', async () => {
    const result = await service.processMessage('Login', { phone: '111' });
    expect(result.intent).toBe(IntentName.Login);
    expect(result.response).toContain('Click here');
  });

  it('processes "Attendance" → login prompt (not linked)', async () => {
    const result = await service.processMessage('Attendance', { phone: '222' });
    expect(result.intent).toBe(IntentName.Attendance);
    expect(result.response).toContain('please login');
  });

  it('processes "Fee details" → login prompt (not linked)', async () => {
    const result = await service.processMessage('Fee details', { phone: '333' });
    expect(result.intent).toBe(IntentName.Fees);
    expect(result.response).toContain('please login');
  });

  it('processes "Today\'s schedule" → login prompt (not linked)', async () => {
    const result = await service.processMessage("Today's schedule", { phone: '444' });
    expect(result.intent).toBe(IntentName.Schedule);
    expect(result.response).toContain('please login');
  });

  it('processes "Exam results" → login prompt (not linked)', async () => {
    const result = await service.processMessage('Exam results', { phone: '555' });
    expect(result.intent).toBe(IntentName.Results);
    expect(result.response).toContain('please login');
  });

  it('processes "DBMS syllabus" → syllabus response', async () => {
    const result = await service.processMessage('DBMS syllabus', { phone: '666' });
    expect(result.intent).toBe(IntentName.Syllabus);
    expect(result.response).toContain('Available Syllabus');
  });

  it('processes "Help" → help response', async () => {
    const result = await service.processMessage('Help', { phone: '777' });
    expect(result.intent).toBe(IntentName.Help);
    expect(result.response).toContain('Available Commands');
  });

  it('processes random text → unknown response', async () => {
    const result = await service.processMessage('Random unsupported message', { phone: '888' });
    expect(result.intent).toBe(IntentName.Unknown);
    expect(result.response).toContain("couldn't understand");
  });

  it('returns mock data when user is linked', async () => {
    mockedFindByPhone.mockResolvedValue({
      _id: { toString: () => 'u1' },
      fullName: 'Arjun Sharma',
      role: 'student',
      studentId: '22CSE001',
      username: '22CSE001',
      department: 'CSE',
      year: 4,
      section: 'A',
      whatsappNumber: '917530063885',
      isActive: true,
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await service.processMessage('Attendance', { phone: '917530063885' });
    expect(result.intent).toBe(IntentName.Attendance);
    expect(result.response).toContain('Attendance Summary');
    expect(result.response).not.toContain('please login');
  });
});
