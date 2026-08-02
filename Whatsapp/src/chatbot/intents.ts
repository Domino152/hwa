export enum IntentName {
  Greeting = 'greeting',
  Help = 'help',
  Attendance = 'attendance',
  Fees = 'fees',
  Schedule = 'schedule',
  Results = 'results',
  Syllabus = 'syllabus',
  Unknown = 'unknown',
}

export interface IntentDefinition {
  name: IntentName;
  patterns: string[];
}

export const SUBJECTS = [
  'DBMS',
  'Java',
  'Operating Systems',
] as const;

/**
 * Ordered so domain-intents (attendance, fees, etc.) match before
 * greeting/help. This ensures "Hi, show my attendance" → attendance.
 */
export const INTENT_DEFINITIONS: IntentDefinition[] = [
  {
    name: IntentName.Attendance,
    patterns: [
      'attendance percentage',
      'my attendance',
      'show attendance',
      'attendance details',
      'attendance status',
      'present or not',
      'am i present',
      'attendance report',
      'attendance',
    ],
  },
  {
    name: IntentName.Fees,
    patterns: [
      'pending fee',
      'fee details',
      'tuition fee',
      'fee structure',
      'remaining fee',
      'due date fee',
      'pay fee',
      'fees',
      'fee',
    ],
  },
  {
    name: IntentName.Schedule,
    patterns: [
      'todays schedule',
      'today schedule',
      'todays classes',
      'today classes',
      'class schedule',
      'class routine',
      'timetable',
      'today timetable',
      'schedule',
    ],
  },
  {
    name: IntentName.Results,
    patterns: [
      'exam result',
      'semester result',
      'exam results',
      'semester results',
      'marks',
      'grade',
      'grades',
      'cgpa',
      'result',
      'results',
    ],
  },
  {
    name: IntentName.Syllabus,
    patterns: [
      'syllabus',
    ],
  },
  {
    name: IntentName.Greeting,
    patterns: [
      'good morning',
      'good evening',
      'good afternoon',
      'good night',
      'hello',
      'hi',
      'hey',
    ],
  },
  {
    name: IntentName.Help,
    patterns: [
      'what can you do',
      'what do you do',
      'commands',
      'options',
      'menu',
      'help',
    ],
  },
];

export interface ChatbotContext {
  phone: string;
}

export interface ChatbotResponse {
  intent: IntentName;
  response: string;
  originalText: string;
}
