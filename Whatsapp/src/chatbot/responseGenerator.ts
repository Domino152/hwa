import {
  IntentName,
  PRIVATE_INTENTS,
  type ChatbotContext,
  type AuthenticatedUserInfo,
} from './intents.js';
import { config } from '../config/index.js';
import { integration } from '../integration/index.js';
import { authService } from '../modules/auth/index.js';
import type { KnowledgeCategory } from '../database/models/KnowledgeBase.js';
import { parseNaturalDate, type ParsedDate } from './dateParser.js';
import { isLidJid } from '../modules/whatsapp/utils/phone.js';
import {
  attendanceCard,
  feesCard,
  scheduleCard,
  resultsCard,
  profileCard,
  announcementsCard,
  greetingCard,
  helpCard,
  loginRequiredCard,
  phoneIdentityUnavailableCard,
  logoutCard,
  unknownIntentCard,
  card,
  sectionHeader,
  bulletItem,
} from './formatter.js';
import { getSession, markGreetingSent, clearSession, type ChatSession } from './sessionManager.js';
import type { ClassificationResult } from './intentClassifier.js';

export interface GenerateOptions {
  classification: ClassificationResult;
  context: ChatbotContext;
  session: ChatSession;
}

export async function getLoginUrl(phone: string, jid?: string): Promise<string> {
  const lid = jid && isLidJid(jid) ? phone : undefined;
  const { rawToken } = await authService.generateLoginToken(phone, lid);
  const base = (config.LOGIN_PORTAL_URL || config.PUBLIC_APP_URL || '').replace(/\/#\/login\/?$/, '').replace(/\/+$/, '');
  return `${base}/#/login?token=${encodeURIComponent(rawToken)}`;
}

/**
 * Generate a rich, formatted response for the classified intent.
 * Uses session context, date awareness, and service-layer data.
 */
export async function generateResponse(
  intent: IntentName,
  context: ChatbotContext,
  classification?: ClassificationResult,
): Promise<string> {
  const session = getSession(context.phone);

  if (
    context.phoneVerified === false &&
    (PRIVATE_INTENTS.includes(intent) ||
      intent === IntentName.Login ||
      intent === IntentName.Logout)
  ) {
    return phoneIdentityUnavailableCard();
  }

  if (PRIVATE_INTENTS.includes(intent) && !context.isAuthenticated) {
    return loginRequiredCard(await getLoginUrl(context.phone, context.jid));
  }

  switch (intent) {
    case IntentName.Greeting:
      return handleGreeting(session, context.jid, context.user);

    case IntentName.Login:
      return handleLogin(context.phone, context.jid);

    case IntentName.Logout:
      return handleLogout(context.isAuthenticated, context.phone, context.jid);

    case IntentName.Attendance:
      return await handleAttendance(context.user!.studentId, classification);

    case IntentName.Fees:
      return await handleFees(context.user!.studentId);

    case IntentName.Schedule:
      return await handleSchedule(context.user!, classification);

    case IntentName.Results:
      return await handleResults(context.user!.studentId);

    case IntentName.Syllabus:
      return handleSyllabus(classification);

    case IntentName.PublicInformation:
      return await handlePublicInformation(context.originalText, classification);

    case IntentName.Profile:
      return await handleProfile(context.user!.studentId);

    case IntentName.Announcements:
      return await handleAnnouncements();

    case IntentName.Help:
      return helpResponse(session);

    case IntentName.Unknown:
    default:
      return unknownIntentCard();
  }
}

async function handleGreeting(session: ChatSession, jid: string | undefined, user?: AuthenticatedUserInfo): Promise<string> {
  if (user) {
    const isFirstTime = !session.greetingSent;
    markGreetingSent(session.phone);
    return greetingCard(user.fullName, isFirstTime);
  }

  return loginRequiredCard(await getLoginUrl(session.phone, jid));
}

async function handleLogin(phone: string, jid?: string): Promise<string> {
  const url = await getLoginUrl(phone, jid);
  return [
    '🔐 *Login Required*',
    '',
    'Please log in to access your personal academic information.',
    '',
    `🔗 ${url}`,
    '',
    '_After logging in, return to this chat._',
  ].join('\n');
}

async function handleLogout(isAuthenticated: boolean, phone: string, jid?: string): Promise<string> {
  if (!isAuthenticated) {
    const loginUrl = await getLoginUrl(phone, jid);
    return [
      'ℹ️ *Already Logged Out*',
      '',
      'You are not currently logged in.',
      '',
      `🔗 Login: ${loginUrl}`,
    ].join('\n');
  }

  await authService.deactivateWhatsAppSessionByPhone(phone);
  clearSession(phone);

  const loginUrl = await getLoginUrl(phone, jid);
  return logoutCard(loginUrl);
}

async function handleAttendance(
  studentId: string,
  classification?: ClassificationResult,
): Promise<string> {
  const data = await integration.attendance.getByStudentId(studentId);

  if (!data.hasData) {
    return card('📊 Attendance', [
      'No attendance records found.',
      '',
      'Please contact your administrator.',
    ]);
  }

  // If subject was mentioned, filter for that subject
  if (classification?.extractedSubject) {
    const subject = classification.extractedSubject;
    const record = data.records.find((r) =>
      r.subject.toLowerCase().includes(subject.toLowerCase()),
    );

    if (record) {
      return [
        sectionHeader(`📊 ${subject} Attendance`, '📊'),
        '',
        `  *Subject:* ${record.subject}`,
        `  *Attendance:* ${record.percentage}%`,
        `  *Classes:* ${record.attendedClasses}/${record.totalClasses}`,
        '',
        `  ${record.percentage >= 85 ? '🟢' : record.percentage >= 75 ? '🟡' : '🔴'} ${
          record.percentage >= 85
            ? 'Great attendance!'
            : record.percentage >= 75
              ? 'Needs improvement'
              : 'Warning: Low attendance!'
        }`,
      ].join('\n');
    }

    return [
      sectionHeader(`📊 ${subject} Attendance`, '📊'),
      '',
      `  No records found for "${subject}".`,
      '',
      '  Available subjects:',
      ...data.records.map((r) => `  • ${r.subject}`),
    ].join('\n');
  }

  return attendanceCard(data.overallPercentage, data.records);
}

async function handleFees(studentId: string): Promise<string> {
  const data = await integration.fees.getByStudentId(studentId);

  if (!data.hasData || !data.fee) {
    return card('💰 Fees', ['No fee records found.', '', 'Please contact your administrator.']);
  }

  return feesCard(data.fee);
}

async function handleSchedule(
  user: AuthenticatedUserInfo & { department?: string; year?: number; section?: string },
  classification?: ClassificationResult,
): Promise<string> {
  // Parse date from the message
  const dateInfo: ParsedDate = classification?.dateExpression
    ? parseNaturalDate(classification.dateExpression)
    : { date: new Date(), label: 'Today', dayOfWeek: getDayName(new Date()), isRange: false };

  const data = await integration.schedule.getByStudent({
    department: user.department ?? 'CSE',
    year: user.year ?? 4,
    section: user.section ?? 'A',
  }, dateInfo.dayOfWeek);

  if (!data.hasData) {
    return card(`📅 ${dateInfo.label} Schedule`, [
      `No classes scheduled for ${dateInfo.label.toLowerCase()}.`,
      '',
      '🎉 Enjoy your day off!',
    ]);
  }

  return scheduleCard(`${dateInfo.label} (${data.dayOfWeek})`, data.entries);
}

async function handleResults(studentId: string): Promise<string> {
  const data = await integration.results.getByStudentId(studentId);

  if (!data.hasData) {
    return card('📝 Results', ['No results found.', '', 'Please contact your administrator.']);
  }

  return resultsCard(data.results, data.cgpa);
}

async function handleProfile(studentId: string): Promise<string> {
  const profile = await integration.getStudentProfile(studentId);

  if (!profile.hasData) {
    return card('👤 Profile', ['Profile not found.', '', 'Please contact your administrator.']);
  }

  return profileCard(profile.student);
}

async function handleAnnouncements(): Promise<string> {
  const result = await integration.publicInformation.getByCategory('events' as KnowledgeCategory);

  if (!result.hasData) {
    return card('📢 Announcements', ['No new announcements.', '', 'Check back later for updates.']);
  }

  const announcements = result.entries.map((e) => ({
    title: e.title,
    content: e.content,
    priority: 'normal' as const,
    publishedAt: e.updatedAt,
  }));

  return announcementsCard(announcements);
}

function handleSyllabus(classification?: ClassificationResult): string {
  const subject = classification?.extractedSubject;

  if (subject) {
    return [
      sectionHeader(`📖 ${subject} Syllabus`, '📖'),
      '',
      `  Syllabus for *${subject}*:`,
      '',
      '  📋 Module 1: Introduction',
      '  📋 Module 2: Core Concepts',
      '  📋 Module 3: Advanced Topics',
      '  📋 Module 4: Applications',
      '  📋 Module 5: Case Studies',
      '',
      '_Contact your faculty for detailed syllabus._',
    ].join('\n');
  }

  return [
    sectionHeader('📖 Available Syllabus', '📖'),
    '',
    '  • DBMS',
    '  • Java',
    '  • Operating Systems',
    '  • Data Structures',
    '  • Computer Networks',
    '',
    '_Please specify the subject name._',
  ].join('\n');
}

async function handlePublicInformation(
  text: string,
  _classification?: ClassificationResult,
): Promise<string> {
  const category = integration.publicInformation.resolveCategory(text) as KnowledgeCategory;
  const result = await integration.publicInformation.getByCategory(category);

  if (!result.hasData) {
    const searchResult = await integration.publicInformation.search(text);
    if (!searchResult.hasData) {
      return [
        sectionHeader('🔍 Search Results', '🔍'),
        '',
        '  No information found for your query.',
        '',
        '  Try asking about:',
        ...['About HITS', 'Admissions', 'Departments', 'Placements', 'Hostel', 'Contact'].map(
          (item) => `  • ${item}`,
        ),
        '',
        '_Type "help" to see all options._',
      ].join('\n');
    }
    return formatSearchResults(searchResult);
  }

  return formatCategoryContent(result);
}

function helpResponse(session: ChatSession): string {
  const isFirstTime = !session.greetingSent;
  if (isFirstTime) {
    markGreetingSent(session.phone);
  }
  return helpCard();
}

function formatCategoryContent(result: {
  entries: { title: string; content: string }[];
  category: string;
}): string {
  const categoryTitle = result.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (result.entries.length === 1) {
    const entry = result.entries[0]!;
    return [sectionHeader(entry.title, 'ℹ️'), '', entry.content].join('\n');
  }

  const lines = result.entries.map(
    (e) => `${bulletItem(`${e.title}: ${e.content.substring(0, 150)}`)}`,
  );

  return [sectionHeader(categoryTitle, 'ℹ️'), '', ...lines].join('\n');
}

function formatSearchResults(result: {
  entries: { title: string; content: string; category: string }[];
}): string {
  const lines = result.entries.map(
    (e, i) => `${i + 1}. *${e.title}*\n   ${e.content.substring(0, 120)}...`,
  );

  return [sectionHeader('🔍 Search Results', '🔍'), '', ...lines].join('\n');
}

function getDayName(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long' });
}
