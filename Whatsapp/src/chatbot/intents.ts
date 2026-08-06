export enum IntentName {
  Greeting = 'greeting',
  Help = 'help',
  Login = 'login',
  Attendance = 'attendance',
  Fees = 'fees',
  Schedule = 'schedule',
  Results = 'results',
  Syllabus = 'syllabus',
  PublicInformation = 'public_information',
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

/** Intents that require the user to be authenticated. */
export const PRIVATE_INTENTS: IntentName[] = [
  IntentName.Attendance,
  IntentName.Fees,
  IntentName.Schedule,
  IntentName.Results,
];

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
      'how to apply',
      'eligibility',
      'admission process',
      'department',
      'departments',
      'cse',
      'ece',
      'mechanical',
      'course',
      'courses',
      'btech',
      'b.tech',
      'mtech',
      'm.tech',
      'programs',
      'programmes',
      'placement',
      'placements',
      'recruitment',
      'package',
      'salary',
      'hostel',
      'hostels',
      'accommodation',
      'bus',
      'transport',
      'transportation',
      'route',
      'shuttle',
      'scholarship',
      'scholarships',
      'financial aid',
      'fee waiver',
      'facility',
      'facilities',
      'campus',
      'infrastructure',
      'library',
      'books',
      'reading room',
      'sport',
      'sports',
      'gym',
      'cricket',
      'football',
      'club',
      'clubs',
      'society',
      'societies',
      'event',
      'events',
      'fest',
      'workshop',
      'seminar',
      'conference',
      'contact',
      'phone',
      'email',
      'address',
      'reach us',
      'location',
      'map',
      'direction',
      'where is',
      'how to reach',
      'achievement',
      'achievements',
      'award',
      'ranking',
      'accreditation',
      'naac',
      'faq',
      'frequently asked',
      'common question',
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

export interface AuthenticatedUserInfo {
  id: string;
  fullName: string;
  role: 'student' | 'parent';
  studentId: string;
}

export interface ChatbotContext {
  phone: string;
  isAuthenticated: boolean;
  originalText: string;
  user?: AuthenticatedUserInfo;
}

export interface ChatbotResponse {
  intent: IntentName;
  response: string;
  originalText: string;
}
