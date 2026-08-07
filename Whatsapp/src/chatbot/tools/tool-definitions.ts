import { Type, type FunctionDeclaration, type Schema } from '@google/genai';

const STRING: Schema = { type: Type.STRING };
const OBJECT = Type.OBJECT;

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: FunctionDeclaration['parameters'];
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_attendance',
    description: 'Get attendance records for a student. Returns overall percentage and subject-wise breakdown. Use this when the user asks about attendance, attendance percentage, or how many classes they attended.',
    parameters: {
      type: OBJECT,
      properties: {
        studentId: {
          ...STRING,
          description: 'The student ID (e.g., "22CSE001")',
        },
        subject: {
          ...STRING,
          description: 'Optional. Filter by specific subject name (e.g., "DBMS", "Java"). If omitted, returns all subjects.',
        },
      },
      required: ['studentId'],
    },
  },
  {
    name: 'get_fees',
    description: 'Get fee details for a student. Returns total fee, paid amount, remaining amount, due date, and payment status. Use this when the user asks about fees, fee payment, pending fees, or fee due dates.',
    parameters: {
      type: OBJECT,
      properties: {
        studentId: {
          ...STRING,
          description: 'The student ID (e.g., "22CSE001")',
        },
      },
      required: ['studentId'],
    },
  },
  {
    name: 'get_schedule',
    description: 'Get class schedule/timetable for a student. Returns time slots, subjects, rooms, and class types. Use this when the user asks about timetable, schedule, classes, or what classes they have today/tomorrow/on a specific day.',
    parameters: {
      type: OBJECT,
      properties: {
        studentId: {
          ...STRING,
          description: 'The student ID (e.g., "22CSE001")',
        },
        dateExpression: {
          ...STRING,
          description: 'Optional. Natural language date like "today", "tomorrow", "next monday", "this week". Defaults to today if omitted.',
        },
      },
      required: ['studentId'],
    },
  },
  {
    name: 'get_results',
    description: 'Get exam results for a student. Returns subject-wise grades, marks, and CGPA. Use this when the user asks about results, grades, marks, CGPA, or exam performance.',
    parameters: {
      type: OBJECT,
      properties: {
        studentId: {
          ...STRING,
          description: 'The student ID (e.g., "22CSE001")',
        },
      },
      required: ['studentId'],
    },
  },
  {
    name: 'get_profile',
    description: 'Get the complete student profile including name, department, year, section, and academic summary. Use this when the user asks about their profile, personal info, or student details.',
    parameters: {
      type: OBJECT,
      properties: {
        studentId: {
          ...STRING,
          description: 'The student ID (e.g., "22CSE001")',
        },
      },
      required: ['studentId'],
    },
  },
  {
    name: 'get_public_information',
    description: 'Get college public information by category. Returns content about the college. Use this for queries about the college itself - admissions, departments, courses, placements, hostel, transportation, scholarships, library, sports, events, contact info, campus map, or FAQ.',
    parameters: {
      type: OBJECT,
      properties: {
        category: {
          ...STRING,
          description: 'The information category. Must be one of: about_hits, admissions, departments, courses, placements, hostel, transportation, scholarships, library, sports, events, contact, campus_map, faq',
          enum: [
            'about_hits', 'admissions', 'departments', 'courses', 'placements',
            'hostel', 'transportation', 'scholarships', 'library', 'sports',
            'events', 'contact', 'campus_map', 'faq',
          ],
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'search_public_information',
    description: 'Search across all college public information by keywords. Use this when the user asks a question about the college that does not clearly fit a specific category, or when you need to find relevant information across multiple categories.',
    parameters: {
      type: OBJECT,
      properties: {
        query: {
          ...STRING,
          description: 'The search query (e.g., "parking", "canteen", "WiFi")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_announcements',
    description: 'Get college announcements and events. Use this when the user asks about news, announcements, events, or what is happening at the college.',
    parameters: {
      type: OBJECT,
      properties: {
        category: {
          ...STRING,
          description: 'Optional. Filter by category: "events" for campus events, or leave empty for all announcements.',
        },
      },
      required: [],
    },
  },
];

export function getToolDeclarations(): FunctionDeclaration[] {
  return TOOL_DEFINITIONS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

export function getToolNames(): string[] {
  return TOOL_DEFINITIONS.map((t) => t.name);
}
