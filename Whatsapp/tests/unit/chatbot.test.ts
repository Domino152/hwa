import { describe, it, expect } from 'vitest';
import { normalizeText } from '../../src/chatbot/helpers.js';
import { classifyIntent } from '../../src/chatbot/intentClassifier.js';
import { generateResponse } from '../../src/chatbot/responseGenerator.js';
import { IntentName } from '../../src/chatbot/intents.js';
import { ChatbotService } from '../../src/chatbot/chatbot.service.js';

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
  const ctx = { phone: '1234567890' };

  it('greeting response contains welcome and subject list', () => {
    const response = generateResponse(IntentName.Greeting, ctx);
    expect(response).toContain('Hello');
    expect(response).toContain('Welcome');
    expect(response).toContain('Attendance');
    expect(response).toContain('DBMS');
  });

  it('attendance response contains attendance summary', () => {
    const response = generateResponse(IntentName.Attendance, ctx);
    expect(response).toContain('Attendance Summary');
    expect(response).toContain('82%');
    expect(response).toContain('DBMS');
  });

  it('fees response contains fee details', () => {
    const response = generateResponse(IntentName.Fees, ctx);
    expect(response).toContain('Fee Details');
    expect(response).toContain('₹1,00,000');
    expect(response).toContain('₹85,000');
    expect(response).toContain('₹15,000');
  });

  it('schedule response contains today\'s schedule', () => {
    const response = generateResponse(IntentName.Schedule, ctx);
    expect(response).toContain("Today's Schedule");
    expect(response).toContain('9:00 - DBMS');
    expect(response).toContain('2:00 - Lab');
  });

  it('results response contains semester results', () => {
    const response = generateResponse(IntentName.Results, ctx);
    expect(response).toContain('Semester Results');
    expect(response).toContain('CGPA');
    expect(response).toContain('9.10');
  });

  it('syllabus response contains subject list', () => {
    const response = generateResponse(IntentName.Syllabus, ctx);
    expect(response).toContain('Available Syllabus');
    expect(response).toContain('DBMS');
    expect(response).toContain('Java');
    expect(response).toContain('Operating Systems');
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

  it('processes "Hi" → greeting response', async () => {
    const result = await service.processMessage('Hi', { phone: '111' });
    expect(result.intent).toBe(IntentName.Greeting);
    expect(result.response).toContain('Hello');
    expect(result.originalText).toBe('Hi');
  });

  it('processes "Attendance" → attendance response', async () => {
    const result = await service.processMessage('Attendance', { phone: '222' });
    expect(result.intent).toBe(IntentName.Attendance);
    expect(result.response).toContain('Attendance Summary');
  });

  it('processes "Fee details" → fees response', async () => {
    const result = await service.processMessage('Fee details', { phone: '333' });
    expect(result.intent).toBe(IntentName.Fees);
    expect(result.response).toContain('Fee Details');
  });

  it('processes "Today\'s schedule" → schedule response', async () => {
    const result = await service.processMessage("Today's schedule", { phone: '444' });
    expect(result.intent).toBe(IntentName.Schedule);
    expect(result.response).toContain("Today's Schedule");
  });

  it('processes "Exam results" → results response', async () => {
    const result = await service.processMessage('Exam results', { phone: '555' });
    expect(result.intent).toBe(IntentName.Results);
    expect(result.response).toContain('Semester Results');
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
});
