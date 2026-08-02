import { IntentName, SUBJECTS, PRIVATE_INTENTS, type ChatbotContext, type AuthenticatedUserInfo } from './intents.js';
import { config } from '../config/index.js';

/**
 * Generate a response for the classified intent.
 * Public intents (help, login, syllabus, greeting, unknown) always return.
 * Private intents (attendance, fees, schedule, results) require authentication.
 */
export function generateResponse(intent: IntentName, context: ChatbotContext): string {
  if (PRIVATE_INTENTS.includes(intent) && !context.isAuthenticated) {
    return loginRequiredResponse();
  }

  switch (intent) {
    case IntentName.Greeting:
      return greetResponse(context.user);
    case IntentName.Login:
      return loginResponse();
    case IntentName.Attendance:
      return attendanceResponse();
    case IntentName.Fees:
      return feesResponse();
    case IntentName.Schedule:
      return scheduleResponse();
    case IntentName.Results:
      return resultsResponse();
    case IntentName.Syllabus:
      return syllabusResponse();
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
    subjectList
  );
}

function loginResponse(): string {
  const url = config.LOGIN_PORTAL_URL;
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

function loginRequiredResponse(): string {
  const url = config.LOGIN_PORTAL_URL;
  return (
    'To access your personal academic information, please login using the secure portal.\n' +
    '\n' +
    `Click here:\n${url}\n` +
    '\n' +
    'After successful login, return to WhatsApp and continue chatting.'
  );
}

function attendanceResponse(): string {
  return (
    'Attendance Summary\n' +
    '\n' +
    'Overall Attendance: 82%\n' +
    '\n' +
    '• DBMS: 90%\n' +
    '• Java: 84%\n' +
    '• Operating Systems: 73%'
  );
}

function feesResponse(): string {
  return (
    'Fee Details\n' +
    '\n' +
    'Total Fee: ₹1,00,000\n' +
    '\n' +
    'Paid: ₹85,000\n' +
    '\n' +
    'Remaining: ₹15,000\n' +
    '\n' +
    'Due Date: 15 August'
  );
}

function scheduleResponse(): string {
  return (
    "Today's Schedule\n" +
    '\n' +
    '• 9:00 - DBMS\n' +
    '• 10:00 - Java\n' +
    '• 11:00 - Operating Systems\n' +
    '• 2:00 - Lab'
  );
}

function resultsResponse(): string {
  return (
    'Semester Results\n' +
    '\n' +
    '• DBMS: A\n' +
    '• Java: A+\n' +
    '• Operating Systems: B+\n' +
    '\n' +
    'CGPA: 9.10'
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

function helpResponse(): string {
  return (
    'Available Commands\n' +
    '\n' +
    '• Attendance\n' +
    '• Fees\n' +
    '• Schedule\n' +
    '• Results\n' +
    '• Syllabus\n' +
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
    '\n' +
    'Type "Help" to view all available options.'
  );
}
