import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeText } from '../../src/chatbot/helpers.js';
import { classifyIntent } from '../../src/chatbot/intentClassifier.js';
import { generateResponse } from '../../src/chatbot/responseGenerator.js';
import { IntentName } from '../../src/chatbot/intents.js';
import { ChatbotService } from '../../src/chatbot/chatbot.service.js';
import { integration } from '../../src/integration/index.js';

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
    },
  },
}));

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

    it('classifies "log in"', () => {
      expect(classifyIntent('log in')).toBe(IntentName.Login);
    });

    it('classifies "i want to sign in"', () => {
      expect(classifyIntent('i want to sign in')).toBe(IntentName.Login);
    });
  });

  describe('Logout intent', () => {
    it('classifies "logout"', () => {
      expect(classifyIntent('logout')).toBe(IntentName.Logout);
    });

    it('classifies "log out"', () => {
      expect(classifyIntent('log out')).toBe(IntentName.Logout);
    });

    it('classifies "sign out"', () => {
      expect(classifyIntent('sign out')).toBe(IntentName.Logout);
    });

    it('classifies "Can I logout?" as logout (keyword match)', () => {
      expect(classifyIntent('Can I logout?')).toBe(IntentName.Logout);
    });

    it('classifies "how do I log out"', () => {
      expect(classifyIntent('how do I log out')).toBe(IntentName.Logout);
    });

    it('classifies "sign me out"', () => {
      expect(classifyIntent('sign me out')).toBe(IntentName.Logout);
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(integration.attendance.getByStudentId).mockResolvedValue({ records: [], overallPercentage: 0, hasData: false });
    vi.mocked(integration.fees.getByStudentId).mockResolvedValue({ fee: null, hasData: false });
    vi.mocked(integration.schedule.getByStudent).mockResolvedValue({ entries: [], dayOfWeek: 'Monday', hasData: false });
    vi.mocked(integration.results.getByStudentId).mockResolvedValue({ results: [], cgpa: 0, hasData: false });
  });

  it('greeting response contains welcome', async () => {
    const response = await generateResponse(IntentName.Greeting, ctx);
    expect(response).toContain('Welcome');
    expect(response).toContain('College AI Assistant');
  });

  it('attendance response returns login prompt when not authenticated', async () => {
    const response = await generateResponse(IntentName.Attendance, ctx);
    expect(response).toContain('Authentication Required');
    expect(response).toContain('login');
  });

  it('attendance response contains attendance summary when authenticated', async () => {
    const authCtx = { ...ctx, isAuthenticated: true, user: { id: '1', fullName: 'Arjun', role: 'student' as const, studentId: '22CSE001' } };
    vi.mocked(integration.attendance.getByStudentId).mockResolvedValue({
      records: [
        { subject: 'DBMS', percentage: 90, totalClasses: 50, attendedClasses: 45 },
        { subject: 'Java', percentage: 84, totalClasses: 50, attendedClasses: 42 },
        { subject: 'Operating Systems', percentage: 74, totalClasses: 50, attendedClasses: 37 },
      ],
      overallPercentage: 83,
      hasData: true,
    });
    const response = await generateResponse(IntentName.Attendance, authCtx);
    expect(response).toContain('Attendance Summary');
    expect(response).toContain('DBMS');
    expect(response).toContain('90%');
  });

  it('fees response returns login prompt when not authenticated', async () => {
    const response = await generateResponse(IntentName.Fees, ctx);
    expect(response).toContain('Authentication Required');
  });

  it('fees response contains fee details when authenticated', async () => {
    const authCtx = { ...ctx, isAuthenticated: true, user: { id: '1', fullName: 'Arjun', role: 'student' as const, studentId: '22CSE001' } };
    vi.mocked(integration.fees.getByStudentId).mockResolvedValue({
      fee: {
        totalFee: 100000,
        paidAmount: 85000,
        remainingAmount: 15000,
        dueDate: new Date('2026-08-15'),
        feeType: 'Tuition Fee',
        status: 'partial',
      },
      hasData: true,
    });
    const response = await generateResponse(IntentName.Fees, authCtx);
    expect(response).toContain('Fee Details');
    expect(response).toContain('1,00,000');
  });

  it('schedule response returns login prompt when not authenticated', async () => {
    const response = await generateResponse(IntentName.Schedule, ctx);
    expect(response).toContain('Authentication Required');
  });

  it('schedule response contains today\'s schedule when authenticated', async () => {
    const authCtx = { ...ctx, isAuthenticated: true, user: { id: '1', fullName: 'Arjun', role: 'student' as const, studentId: '22CSE001' } };
    vi.mocked(integration.schedule.getByStudent).mockResolvedValue({
      entries: [
        { timeSlot: '09:00 - 10:00', subject: 'DBMS', room: 'Room 301', type: 'lecture' },
        { timeSlot: '10:00 - 11:00', subject: 'Java', room: 'Room 301', type: 'lecture' },
      ],
      dayOfWeek: 'Monday',
      hasData: true,
    });
    const response = await generateResponse(IntentName.Schedule, authCtx);
    expect(response.toLowerCase()).toContain("today");
    expect(response).toContain('DBMS');
    expect(response).toContain('Java');
  });

  it('results response returns login prompt when not authenticated', async () => {
    const response = await generateResponse(IntentName.Results, ctx);
    expect(response).toContain('Authentication Required');
  });

  it('results response contains semester results when authenticated', async () => {
    const authCtx = { ...ctx, isAuthenticated: true, user: { id: '1', fullName: 'Arjun', role: 'student' as const, studentId: '22CSE001' } };
    vi.mocked(integration.results.getByStudentId).mockResolvedValue({
      results: [
        { subject: 'DBMS', grade: 'A', marksObtained: 92, totalMarks: 100 },
        { subject: 'Java', grade: 'A+', marksObtained: 96, totalMarks: 100 },
        { subject: 'Operating Systems', grade: 'B+', marksObtained: 87, totalMarks: 100 },
      ],
      cgpa: 9.1,
      hasData: true,
    });
    const response = await generateResponse(IntentName.Results, authCtx);
    expect(response).toContain('Results');
    expect(response).toContain('DBMS');
    expect(response).toContain('A');
  });

  it('syllabus response contains subject list', async () => {
    const response = await generateResponse(IntentName.Syllabus, ctx);
    expect(response).toContain('Syllabus');
    expect(response).toContain('DBMS');
    expect(response).toContain('Java');
  });

  it('login response contains login URL', async () => {
    const response = await generateResponse(IntentName.Login, ctx);
    expect(response).toContain('Login Portal');
    expect(response).toContain('login');
  });

  it('help response contains available commands', async () => {
    const response = await generateResponse(IntentName.Help, ctx);
    expect(response).toContain('Available Commands');
    expect(response).toContain('Attendance');
    expect(response).toContain('Fees');
  });

  it('unknown response contains guidance', async () => {
    const response = await generateResponse(IntentName.Unknown, ctx);
    expect(response).toContain("didn't quite get that");
    expect(response.toLowerCase()).toContain('help');
  });
});

describe('ChatbotService', () => {
  const service = new ChatbotService();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(integration.findUserByPhone).mockResolvedValue(null);
    vi.mocked(integration.attendance.getByStudentId).mockResolvedValue({ records: [], overallPercentage: 0, hasData: false });
    vi.mocked(integration.fees.getByStudentId).mockResolvedValue({ fee: null, hasData: false });
    vi.mocked(integration.schedule.getByStudent).mockResolvedValue({ entries: [], dayOfWeek: 'Monday', hasData: false });
    vi.mocked(integration.results.getByStudentId).mockResolvedValue({ results: [], cgpa: 0, hasData: false });
  });

  it('processes "Hi" → greeting response', async () => {
    const result = await service.processMessage('Hi', { phone: '111' });
    expect(result.intent).toBe(IntentName.Greeting);
    expect(result.response).toContain('Welcome');
    expect(result.originalText).toBe('Hi');
  });

  it('processes "Login" → login response', async () => {
    const result = await service.processMessage('Login', { phone: '111' });
    expect(result.intent).toBe(IntentName.Login);
    expect(result.response).toContain('Login Portal');
  });

  it('processes "Attendance" → login prompt (not linked)', async () => {
    const result = await service.processMessage('Attendance', { phone: '222' });
    expect(result.intent).toBe(IntentName.Attendance);
    expect(result.response).toContain('Authentication Required');
  });

  it('processes "Fee details" → login prompt (not linked)', async () => {
    const result = await service.processMessage('Fee details', { phone: '333' });
    expect(result.intent).toBe(IntentName.Fees);
    expect(result.response).toContain('Authentication Required');
  });

  it('processes "Today\'s schedule" → login prompt (not linked)', async () => {
    const result = await service.processMessage("Today's schedule", { phone: '444' });
    expect(result.intent).toBe(IntentName.Schedule);
    expect(result.response).toContain('Authentication Required');
  });

  it('processes "Exam results" → login prompt (not linked)', async () => {
    const result = await service.processMessage('Exam results', { phone: '555' });
    expect(result.intent).toBe(IntentName.Results);
    expect(result.response).toContain('Authentication Required');
  });

  it('processes "DBMS syllabus" → syllabus response', async () => {
    const result = await service.processMessage('DBMS syllabus', { phone: '666' });
    expect(result.intent).toBe(IntentName.Syllabus);
    expect(result.response).toContain('Syllabus');
  });

  it('processes "Help" → help response', async () => {
    const result = await service.processMessage('Help', { phone: '777' });
    expect(result.intent).toBe(IntentName.Help);
    expect(result.response).toContain('Available Commands');
  });

  it('processes random text → unknown response', async () => {
    const result = await service.processMessage('Random unrelated text', { phone: '888' });
    expect(result.intent).toBe(IntentName.Unknown);
    expect(result.response).toContain("didn't quite get that");
  });

  it('returns DB data when user is linked', async () => {
    vi.mocked(integration.findUserByPhone).mockResolvedValue({
      id: 'u1',
      fullName: 'Arjun Sharma',
      role: 'student',
      studentId: '22CSE001',
      department: 'CSE',
      year: 4,
      section: 'A',
    });

    vi.mocked(integration.attendance.getByStudentId).mockResolvedValue({
      records: [
        { subject: 'DBMS', percentage: 90, totalClasses: 50, attendedClasses: 45 },
        { subject: 'Java', percentage: 84, totalClasses: 50, attendedClasses: 42 },
      ],
      overallPercentage: 87,
      hasData: true,
    });

    const result = await service.processMessage('Attendance', { phone: '917530063885' });
    expect(result.intent).toBe(IntentName.Attendance);
    expect(result.response).toContain('Attendance Summary');
    expect(result.response).toContain('DBMS');
    expect(result.response).not.toContain('Authentication Required');
  });
});
