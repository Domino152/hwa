export enum IntentName {
  Greeting = 'greeting',
  Help = 'help',
  Login = 'login',
  Logout = 'logout',
  Attendance = 'attendance',
  Fees = 'fees',
  Schedule = 'schedule',
  Results = 'results',
  Syllabus = 'syllabus',
  PublicInformation = 'public_information',
  Profile = 'profile',
  Announcements = 'announcements',
  Unknown = 'unknown',
}

export interface IntentDefinition {
  name: IntentName;
  patterns: string[];
}

export const SUBJECTS = ['DBMS', 'Java', 'Operating Systems'] as const;

/** Intents that require the user to be authenticated. */
export const PRIVATE_INTENTS: IntentName[] = [
  IntentName.Attendance,
  IntentName.Fees,
  IntentName.Schedule,
  IntentName.Results,
  IntentName.Profile,
];

/**
 * Ordered so domain-intents (attendance, fees, etc.) match before
 * greeting/help. This ensures "Hi, show my attendance" → attendance.
 */
export const INTENT_DEFINITIONS: IntentDefinition[] = [
  {
    name: IntentName.Attendance,
    patterns: ['attendance'],
  },
  {
    name: IntentName.Fees,
    patterns: ['fees', 'fee'],
  },
  {
    name: IntentName.Schedule,
    patterns: ['schedule', 'timetable', 'classes'],
  },
  {
    name: IntentName.Results,
    patterns: ['result', 'results', 'marks', 'grade', 'grades', 'cgpa'],
  },
  {
    name: IntentName.Syllabus,
    patterns: ['syllabus'],
  },
  {
    name: IntentName.Announcements,
    patterns: ['announcement', 'announcements'],
  },
  {
    name: IntentName.PublicInformation,
    patterns: [
      'about hits',
      'tell me about',
      'college info',
      'college information',
      'about college',
      'what is hits',
      'admission',
      'admissions',
      'department',
      'departments',
      'placement',
      'placements',
      'hostel',
      'transport',
      'scholarship',
      'library',
      'sports',
      'club',
      'clubs',
      'event',
      'events',
      'contact',
      'address',
      'location',
      'campus',
      'faq',
    ],
  },
  {
    name: IntentName.Profile,
    patterns: [
      'my profile',
      'show profile',
      'student profile',
      'my details',
      'my info',
      'my information',
      'account details',
      'who am i',
    ],
  },
  {
    name: IntentName.Login,
    patterns: [
      'sign in',
      'signin',
      'log in',
      'login',
      'authenticate',
      'verify account',
      'access account',
      'i want to login',
      'i want to sign in',
    ],
  },
  {
    name: IntentName.Logout,
    patterns: [
      'logout',
      'log out',
      'sign out',
      'signout',
      'disconnect',
      'unlink',
      'log off',
      'sign off',
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
    patterns: ['what can you do', 'what do you do', 'commands', 'options', 'menu', 'help'],
  },
];

export interface AuthenticatedUserInfo {
  id: string;
  fullName: string;
  role: 'student' | 'parent';
  studentId: string;
}

export interface ChatbotContext {
  phone: string;
  phoneVerified?: boolean;
  isAuthenticated: boolean;
  originalText: string;
  user?: AuthenticatedUserInfo;
}

export interface ChatbotResponse {
  intent: IntentName;
  response: string;
  originalText: string;
  suggestedActions?: Array<{ id: string; text: string }>;
}
