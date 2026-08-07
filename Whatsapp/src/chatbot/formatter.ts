/**
 * Rich message formatter for WhatsApp responses.
 * Produces structured, emoji-decorated messages.
 */

const DIVIDER = '━'.repeat(20);

export function sectionHeader(title: string, emoji?: string): string {
  const prefix = emoji ? `${emoji} ` : '';
  return `\n${prefix}*${title}*\n${DIVIDER}`;
}

export function keyValue(key: string, value: string | number): string {
  return `  *${key}:* ${value}`;
}

export function bulletItem(text: string, emoji?: string): string {
  const prefix = emoji ?? '•';
  return `${prefix} ${text}`;
}

export function numberedItem(index: number, title: string, detail?: string): string {
  if (detail) {
    return `${index}. *${title}*\n   ${detail}`;
  }
  return `${index}. *${title}*`;
}

export function progressBar(percentage: number, length: number = 10): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage}%`;
}

export function statusBadge(status: string): string {
  const badges: Record<string, string> = {
    paid: '✅',
    partial: '⚠️',
    pending: '🔴',
    overdue: '🔴',
    active: '🟢',
    inactive: '⚪',
    success: '✅',
    failed: '❌',
  };
  return badges[status.toLowerCase()] ?? 'ℹ️';
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDayOfWeek(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'long' });
}

export function card(title: string, lines: string[], footer?: string): string {
  const parts = [sectionHeader(title)];
  parts.push(lines.join('\n'));
  if (footer) {
    parts.push(`\n_${footer}_`);
  }
  return parts.join('\n');
}

export function greetingCard(name: string, isFirstTime: boolean): string {
  if (isFirstTime) {
    return [
      `👋 *Welcome, ${name}!*`,
      '',
      'I\'m your *College AI Assistant*.',
      'I can help you with:',
      '',
      '📊 *Attendance* — Check your attendance',
      '💰 *Fees* — View fee status',
      '📅 *Timetable* — See your schedule',
      '📝 *Results* — View exam results',
      '📢 *Announcements* — College updates',
      '👤 *Profile* — Your info',
      '',
      '_Type a question or tap a menu below._',
    ].join('\n');
  }

  return `👋 *Welcome back, ${name}!*\n\nHow can I help you today?`;
}

export function helpCard(): string {
  return [
    '📚 *Available Commands*',
    '',
    '📊 *Attendance* — Check attendance percentage',
    '💰 *Fees* — View fee details & dues',
    '📅 *Timetable* — Today\'s schedule',
    '📝 *Results* — Exam results & CGPA',
    '📢 *Announcements* — College news',
    '👤 *Profile* — Your student profile',
    '',
    '_You can ask naturally, e.g._',
    '_"What is my attendance in Java?"_',
    '_"Do I have pending fees?"_',
    '_"What\'s my timetable tomorrow?"_',
  ].join('\n');
}

export function loginRequiredCard(loginUrl: string): string {
  return [
    '🔒 *Authentication Required*',
    '',
    'To view your personal data,',
    'please login through the portal:',
    '',
    `🔗 ${loginUrl}`,
    '',
    '_After logging in, come back here._',
  ].join('\n');
}

export function unknownIntentCard(): string {
  return [
    '🤔 *I didn\'t quite get that*',
    '',
    'Try asking about:',
    '',
    '📊 Attendance',
    '💰 Fees',
    '📅 Timetable',
    '📝 Results',
    '',
    '_Or type "help" for all options._',
  ].join('\n');
}

export function attendanceCard(
  overallPercentage: number,
  subjects: Array<{ subject: string; percentage: number; attendedClasses: number; totalClasses: number }>,
): string {
  const lines = [
    sectionHeader('📊 Attendance Summary', '📊'),
    '',
    `  *Overall:* ${progressBar(overallPercentage)}\n`,
  ];

  for (const s of subjects) {
    const emoji = s.percentage >= 85 ? '🟢' : s.percentage >= 75 ? '🟡' : '🔴';
    lines.push(`  ${emoji} *${s.subject}*`);
    lines.push(`    ${s.attendedClasses}/${s.totalClasses} classes — ${progressBar(s.percentage)}`);
    lines.push('');
  }

  lines.push(`_${DIVIDER}_`);
  return lines.join('\n');
}

export function feesCard(fee: {
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  status: string;
}): string {
  return [
    sectionHeader('💰 Fee Details', '💰'),
    '',
    `  ${statusBadge(fee.status)} *Status:* ${fee.status.toUpperCase()}`,
    '',
    `  *Total Fee:* ${formatCurrency(fee.totalFee)}`,
    `  *Paid:* ${formatCurrency(fee.paidAmount)}`,
    `  *Remaining:* ${formatCurrency(fee.remainingAmount)}`,
    `  *Due Date:* ${formatDate(fee.dueDate)}`,
    '',
    `_Pay before the due date to avoid late fees._`,
  ].join('\n');
}

export function scheduleCard(
  dayLabel: string,
  entries: Array<{ timeSlot: string; subject: string; room: string; type: string }>,
): string {
  if (entries.length === 0) {
    return [
      sectionHeader(`📅 ${dayLabel}`, '📅'),
      '',
      '  No classes scheduled.',
      '  🎉 Enjoy your day off!',
    ].join('\n');
  }

  const lines = [
    sectionHeader(`📅 ${dayLabel}`, '📅'),
    '',
  ];

  for (const e of entries) {
    const typeEmoji = e.type === 'lab' ? '🧪' : e.type === 'tutorial' ? '📝' : '📖';
    lines.push(`  ${typeEmoji} *${e.timeSlot}*`);
    lines.push(`    ${e.subject} — Room ${e.room}`);
    lines.push('');
  }

  lines.push(`_${entries.length} classes today_`);
  return lines.join('\n');
}

export function resultsCard(
  results: Array<{ subject: string; grade: string; marksObtained: number; totalMarks: number }>,
  cgpa: number,
): string {
  const lines = [
    sectionHeader('📝 Exam Results', '📝'),
    '',
  ];

  for (const r of results) {
    const emoji = r.grade.startsWith('A') ? '🌟' : r.grade.startsWith('B') ? '✅' : '⚠️';
    lines.push(`  ${emoji} *${r.subject}*`);
    lines.push(`    Grade: ${r.grade} | Marks: ${r.marksObtained}/${r.totalMarks}`);
    lines.push('');
  }

  lines.push(`  ${'━'.repeat(15)}`);
  lines.push(`  🏆 *CGPA: ${cgpa.toFixed(2)}*`);
  return lines.join('\n');
}

export function profileCard(profile: {
  fullName: string;
  studentId: string;
  department: string;
  year: number;
  section: string;
}): string {
  return [
    sectionHeader('👤 Student Profile', '👤'),
    '',
    `  *Name:* ${profile.fullName}`,
    `  *ID:* ${profile.studentId}`,
    `  *Dept:* ${profile.department}`,
    `  *Year:* ${profile.year} — Section ${profile.section}`,
    '',
    `_${DIVIDER}_`,
  ].join('\n');
}

export function announcementsCard(
  announcements: Array<{ title: string; content: string; priority: string; publishedAt: Date }>,
): string {
  if (announcements.length === 0) {
    return [
      sectionHeader('📢 Announcements', '📢'),
      '',
      '  No new announcements.',
    ].join('\n');
  }

  const lines = [
    sectionHeader('📢 Announcements', '📢'),
    '',
  ];

  for (const a of announcements) {
    const priorityEmoji = a.priority === 'urgent' ? '🔴' : a.priority === 'high' ? '🟡' : '🔵';
    lines.push(`  ${priorityEmoji} *${a.title}*`);
    lines.push(`    ${a.content.substring(0, 120)}${a.content.length > 120 ? '...' : ''}`);
    lines.push(`    _${formatDate(a.publishedAt)}_`);
    lines.push('');
  }

  return lines.join('\n');
}
