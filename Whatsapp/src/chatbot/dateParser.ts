export interface ParsedDate {
  date: Date;
  label: string;
  dayOfWeek: string;
  isRange: boolean;
  endDate?: Date;
  endLabel?: string;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_INDICES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const RELATIVE_DAY_MAP: Record<string, number> = {
  today: 0,
  tomorrow: 1,
  'day after tomorrow': 2,
  yesterday: -1,
  'day before yesterday': -2,
};

function getDayName(d: Date): string {
  return DAY_NAMES[d.getDay()]!;
}

function daysUntil(targetDay: number, from: Date): number {
  const diff = targetDay - from.getDay();
  return diff <= 0 ? diff + 7 : diff;
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Parse natural language date expressions.
 * Returns a ParsedDate with the resolved Date and human-readable label.
 * Falls back to today if unparseable.
 */
export function parseNaturalDate(text: string, referenceDate?: Date): ParsedDate {
  const now = referenceDate ?? new Date();
  const normalized = text.toLowerCase().trim();

  // Check for relative days: "today", "tomorrow", "yesterday"
  for (const [keyword, offset] of Object.entries(RELATIVE_DAY_MAP)) {
    if (normalized.includes(keyword)) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      return {
        date: d,
        label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : offset === -1 ? 'Yesterday' : formatDayLabel(d),
        dayOfWeek: getDayName(d),
        isRange: false,
      };
    }
  }

  // Check for "this week" / "next week"
  if (normalized.includes('this week') || normalized.includes('current week')) {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    return {
      date: startOfWeek,
      label: 'This Week',
      dayOfWeek: getDayName(now),
      isRange: true,
      endDate: endOfWeek,
      endLabel: formatDayLabel(endOfWeek),
    };
  }

  if (normalized.includes('next week')) {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 8); // Next Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      date: startOfWeek,
      label: 'Next Week',
      dayOfWeek: getDayName(startOfWeek),
      isRange: true,
      endDate: endOfWeek,
      endLabel: formatDayLabel(endOfWeek),
    };
  }

  // Check for "next <day>" patterns: "next monday", "next friday"
  for (const [dayName, dayIndex] of Object.entries(DAY_INDICES)) {
    if (normalized.includes(`next ${dayName}`)) {
      const offset = daysUntil(dayIndex, now) + 7; // Always next occurrence
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      return {
        date: d,
        label: `Next ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`,
        dayOfWeek: getDayName(d),
        isRange: false,
      };
    }
  }

  // Check for "on <day>" patterns: "on monday"
  for (const [dayName, dayIndex] of Object.entries(DAY_INDICES)) {
    if (normalized.includes(`on ${dayName}`) || normalized.includes(`every ${dayName}`)) {
      const offset = daysUntil(dayIndex, now);
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      return {
        date: d,
        label: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`,
        dayOfWeek: getDayName(d),
        isRange: false,
      };
    }
  }

  // Check for month names: "in january", "for march"
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const shortMonths = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ];

  for (let i = 0; i < monthNames.length; i++) {
    const monthName = monthNames[i];
    const shortName = shortMonths[i];
    if (monthName && (normalized.includes(monthName) || (shortName && normalized.includes(shortName)))) {
      const d = new Date(now.getFullYear(), i, 1);
      return {
        date: d,
        label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        dayOfWeek: getDayName(d),
        isRange: false,
      };
    }
  }

  // Check for "this semester" / "current semester"
  if (normalized.includes('this semester') || normalized.includes('current semester')) {
    const month = now.getMonth();
    const isOddSemester = month >= 6 && month <= 11;
    const semesterLabel = isOddSemester ? 'Odd Semester (Jul-Dec)' : 'Even Semester (Jan-Jun)';
    return {
      date: now,
      label: semesterLabel,
      dayOfWeek: getDayName(now),
      isRange: false,
    };
  }

  // Fallback: today
  return {
    date: now,
    label: 'Today',
    dayOfWeek: getDayName(now),
    isRange: false,
  };
}

/**
 * Extract date-related keywords from a user message.
 * Returns the date expression if found, null otherwise.
 */
export function extractDateExpression(text: string): string | null {
  const normalized = text.toLowerCase().trim();

  const dateExpressions = [
    'day after tomorrow', 'day before yesterday',
    'this week', 'next week', 'current week',
    'this semester', 'current semester',
    'today', 'tomorrow', 'yesterday',
  ];

  // Check multi-word expressions first (sorted by length descending)
  for (const expr of dateExpressions) {
    if (normalized.includes(expr)) {
      return expr;
    }
  }

  // Check "next <day>" patterns
  for (const day of Object.keys(DAY_INDICES)) {
    if (normalized.includes(`next ${day}`)) {
      return `next ${day}`;
    }
    if (normalized.includes(`on ${day}`)) {
      return `on ${day}`;
    }
  }

  // Check month names
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  for (const m of months) {
    if (normalized.includes(m)) {
      return m;
    }
  }

  return null;
}
