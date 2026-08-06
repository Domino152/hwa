import { IntentName, SUBJECTS, PRIVATE_INTENTS, type ChatbotContext, type AuthenticatedUserInfo } from './intents.js';
import { config } from '../config/index.js';
import { integration } from '../integration/index.js';
import type { PublicContentCategory } from '../database/models/PublicContent.js';

/**
 * Generate a response for the classified intent.
 * Public intents (help, login, syllabus, greeting, unknown) always return.
 * Private intents (attendance, fees, schedule, results) require authentication
 * and query the database via the Integration Layer for real data.
 */
export async function generateResponse(intent: IntentName, context: ChatbotContext): Promise<string> {
  if (PRIVATE_INTENTS.includes(intent) && !context.isAuthenticated) {
    return loginRequiredResponse(context.phone);
  }

  switch (intent) {
    case IntentName.Greeting:
      return greetResponse(context.user);
    case IntentName.Login:
      return loginResponse(context.phone);
    case IntentName.Attendance:
      return await attendanceResponse(context.user!.studentId);
    case IntentName.Fees:
      return await feesResponse(context.user!.studentId);
    case IntentName.Schedule:
      return await scheduleResponse(context.user!);
    case IntentName.Results:
      return await resultsResponse(context.user!.studentId);
    case IntentName.Syllabus:
      return syllabusResponse();
    case IntentName.PublicInformation:
      return await publicInformationResponse(context.originalText);
    case IntentName.Help:
      return helpResponse();
    case IntentName.Unknown:
    default:
      return unknownResponse();
  }
}

function greetResponse(user?: AuthenticatedUserInfo): string {
  if (user) {
    return (
      `Hello ${user.fullName} 👋\n` +
      '\n' +
      'Welcome back to the College AI Assistant.\n' +
      '\n' +
      'How can I help you today?'
    );
  }

  const subjectList = SUBJECTS.map((s) => `• ${s}`).join('\n');
  return (
    'Hello 👋\n' +
    '\n' +
    'Welcome to the College AI Assistant.\n' +
    '\n' +
    'How can I help you today?\n' +
    '\n' +
    'You can ask about:\n' +
    '\n' +
    '• Attendance\n' +
    '• Fees\n' +
    '• Schedule\n' +
    '• Results\n' +
    '• College Information\n' +
    subjectList
  );
}

function loginResponse(phone: string): string {
  const url = `${config.LOGIN_PORTAL_URL}?phone=${phone}`;
  return (
    'Welcome to the College AI Assistant.\n' +
    '\n' +
    'To access your personal information, please login using the secure portal.\n' +
    '\n' +
    `Click here:\n${url}\n` +
    '\n' +
    'After successful login, return to WhatsApp and continue chatting.'
  );
}

function loginRequiredResponse(phone: string): string {
  const url = `${config.LOGIN_PORTAL_URL}?phone=${phone}`;
  return (
    'To access your personal academic information, please login using the secure portal.\n' +
    '\n' +
    `Click here:\n${url}\n` +
    '\n' +
    'After successful login, return to WhatsApp and continue chatting.'
  );
}

async function attendanceResponse(studentId: string): Promise<string> {
  const data = await integration.attendance.getByStudentId(studentId);

  if (!data.hasData) {
    return (
      'Attendance Summary\n' +
      '\n' +
      'No attendance records found.\n' +
      '\n' +
      'Please contact your administrator.'
    );
  }

  const subjectLines = data.records.map((r) => `• ${r.subject}: ${r.percentage}%`).join('\n');

  return (
    'Attendance Summary\n' +
    '\n' +
    `Overall Attendance: ${data.overallPercentage}%\n` +
    '\n' +
    subjectLines
  );
}

async function feesResponse(studentId: string): Promise<string> {
  const data = await integration.fees.getByStudentId(studentId);

  if (!data.hasData || !data.fee) {
    return (
      'Fee Details\n' +
      '\n' +
      'No fee records found.\n' +
      '\n' +
      'Please contact your administrator.'
    );
  }

  const dueDateStr = data.fee.dueDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
  });

  return (
    'Fee Details\n' +
    '\n' +
    `Total Fee: ₹${data.fee.totalFee.toLocaleString('en-IN')}\n` +
    '\n' +
    `Paid: ₹${data.fee.paidAmount.toLocaleString('en-IN')}\n` +
    '\n' +
    `Remaining: ₹${data.fee.remainingAmount.toLocaleString('en-IN')}\n` +
    '\n' +
    `Due Date: ${dueDateStr}`
  );
}

async function scheduleResponse(_user: AuthenticatedUserInfo): Promise<string> {
  const data = await integration.schedule.getByStudent({
    department: 'CSE',
    year: 4,
    section: 'A',
  });

  if (!data.hasData) {
    return (
      `Schedule for ${data.dayOfWeek}\n` +
      '\n' +
      'No classes scheduled for today.\n' +
      '\n' +
      'Enjoy your day off!'
    );
  }

  const classLines = data.entries
    .map((e) => `• ${e.timeSlot} - ${e.subject}`)
    .join('\n');

  return (
    `Today's Schedule (${data.dayOfWeek})\n` +
    '\n' +
    classLines
  );
}

async function resultsResponse(studentId: string): Promise<string> {
  const data = await integration.results.getByStudentId(studentId);

  if (!data.hasData) {
    return (
      'Semester Results\n' +
      '\n' +
      'No results found.\n' +
      '\n' +
      'Please contact your administrator.'
    );
  }

  const subjectLines = data.results.map((r) => `• ${r.subject}: ${r.grade}`).join('\n');

  return (
    'Semester Results\n' +
    '\n' +
    subjectLines +
    '\n' +
    '\n' +
    `CGPA: ${data.cgpa.toFixed(2)}`
  );
}

function syllabusResponse(): string {
  const subjectList = SUBJECTS.map((s) => `• ${s}`).join('\n');
  return (
    'Available Syllabus\n' +
    '\n' +
    subjectList +
    '\n' +
    '\n' +
    'Please specify the subject name.'
  );
}

async function publicInformationResponse(text: string): Promise<string> {
  const category = integration.publicInformation.resolveCategory(text) as PublicContentCategory;
  const result = await integration.publicInformation.getByCategory(category);

  if (!result.hasData) {
    const searchResult = await integration.publicInformation.search(text);
    if (!searchResult.hasData) {
      return (
        "Sorry, I couldn't find information about that.\n" +
        '\n' +
        'You can ask about:\n' +
        '\n' +
        '• About HITS\n' +
        '• Admissions\n' +
        '• Departments\n' +
        '• Courses\n' +
        '• Placements\n' +
        '• Hostel\n' +
        '• Transportation\n' +
        '• Scholarships\n' +
        '• Campus Facilities\n' +
        '• Library\n' +
        '• Sports\n' +
        '• Clubs\n' +
        '• Events\n' +
        '• Contact\n' +
        '• Location\n' +
        '• Achievements\n' +
        '• FAQ\n' +
        '\n' +
        'Type "Help" to view all available options.'
      );
    }
    return formatSearchResults(searchResult);
  }

  return formatCategoryContent(result);
}

function formatCategoryContent(result: { entries: { title: string; content: string }[]; category: string }): string {
  const categoryTitle = result.category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (result.entries.length === 1) {
    const entry = result.entries[0]!;
    return `${entry.title}\n\n${entry.content}`;
  }

  const entryLines = result.entries
    .map((e, i) => `${i + 1}. ${e.title}\n${e.content}`)
    .join('\n\n');

  return `${categoryTitle}\n\n${entryLines}`;
}

function formatSearchResults(result: { entries: { title: string; content: string; category: string }[] }): string {
  const lines = result.entries
    .map((e, i) => `${i + 1}. ${e.title}\n${e.content.substring(0, 150)}...`)
    .join('\n\n');

  return (
    'Here\'s what I found:\n\n' +
    lines
  );
}

function helpResponse(): string {
  return (
    'Available Commands\n' +
    '\n' +
    '• Attendance\n' +
    '• Fees\n' +
    '• Schedule\n' +
    '• Results\n' +
    '• Syllabus\n' +
    '• College Information\n' +
    '\n' +
    'You can type your question naturally.\n' +
    '\n' +
    'Type "Login" to access your personal information.'
  );
}

function unknownResponse(): string {
  return (
    "Sorry, I couldn't understand your request.\n" +
    '\n' +
    'You can ask about:\n' +
    '\n' +
    '• Attendance\n' +
    '• Fees\n' +
    '• Schedule\n' +
    '• Results\n' +
    '• Syllabus\n' +
    '• College Information\n' +
    '\n' +
    'Type "Help" to view all available options.'
  );
}
