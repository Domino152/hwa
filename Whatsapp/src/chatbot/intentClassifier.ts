import { IntentName } from './intents.js';
import { normalizeText } from './helpers.js';
import { extractDateExpression } from './dateParser.js';

/**
 * NLP-based intent classifier with scoring.
 * Uses tokenization, synonym mapping, and fuzzy matching
 * to understand natural language queries.
 */

interface IntentPattern {
  intent: IntentName;
  keywords: string[];
  phrases: string[];
  requiredTokens?: string[];
  excludeTokens?: string[];
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Attendance - high priority, very specific
  {
    intent: IntentName.Attendance,
    keywords: ['attendance', 'present', 'absent', 'classes', 'attended', 'truancy', 'bunk'],
    phrases: [
      'attendance percentage',
      'my attendance',
      'attendance in',
      'attendance for',
      'attendance of',
      'how many classes',
      'how much attendance',
      'attendance status',
      'attendance report',
      'present or not',
      'am i present',
      'attendance summary',
      'check attendance',
      'attendance details',
    ],
    weight: 1.0,
  },
  // Fees - high priority
  {
    intent: IntentName.Fees,
    keywords: ['fee', 'fees', 'payment', 'paid', 'dues', 'tuition', 'balance', 'pending'],
    phrases: [
      'pending fee',
      'fee details',
      'fee status',
      'fee structure',
      'remaining fee',
      'due date fee',
      'pay fee',
      'fee payment',
      'any pending',
      'how much fee',
      'fee amount',
      'due fees',
      'unpaid',
      'outstanding',
    ],
    weight: 1.0,
  },
  // Schedule - high priority
  {
    intent: IntentName.Schedule,
    keywords: ['schedule', 'timetable', 'class', 'classes', 'routine', 'lecture', 'period', 'slot'],
    phrases: [
      'today schedule',
      'today timetable',
      'today classes',
      'tomorrow schedule',
      'tomorrow timetable',
      'tomorrow classes',
      'class schedule',
      'class routine',
      'daily schedule',
      'weekly schedule',
      'next class',
      'what classes',
      'which classes',
      'when is class',
      'class time',
      'period',
    ],
    weight: 1.0,
  },
  // Results - high priority
  {
    intent: IntentName.Results,
    keywords: ['result', 'results', 'marks', 'grade', 'grades', 'cgpa', 'gpa', 'score', 'exam', 'semester'],
    phrases: [
      'exam result',
      'semester result',
      'exam results',
      'semester results',
      'my results',
      'my marks',
      'my grades',
      'my cgpa',
      'what is my cgpa',
      'result status',
      'marksheet',
      'grade card',
      'performance',
    ],
    weight: 1.0,
  },
  // Public Information - lower priority, broader
  {
    intent: IntentName.PublicInformation,
    keywords: [
      'about', 'hits', 'college', 'university', 'admission', 'department', 'course', 'program',
      'placement', 'hostel', 'transport', 'scholarship', 'library', 'sports', 'club', 'event',
      'contact', 'address', 'location', 'ranking', 'accreditation', 'naac', 'faq',
      'cse', 'ece', 'mechanical', 'it', 'civil', 'eee',
    ],
    phrases: [
      'tell me about',
      'what is hits',
      'about college',
      'college info',
      'college information',
      'how to apply',
      'admission process',
      'eligibility',
      'campus',
      'infrastructure',
      'facilities',
      'achievements',
      'awards',
      'recruitment',
      'package',
      'salary',
      'accommodation',
      'shuttle',
      'bus route',
      'financial aid',
      'fee waiver',
      'reading room',
      'gym',
      'cricket',
      'football',
      'societies',
      'fest',
      'workshop',
      'seminar',
      'conference',
      'email',
      'phone',
      'direction',
      'how to reach',
      'where is',
      'frequently asked',
      'common question',
    ],
    weight: 0.6,
  },
  // Login
  {
    intent: IntentName.Login,
    keywords: ['login', 'log in', 'signin', 'sign in', 'authenticate', 'verify', 'access'],
    phrases: [
      'i want to login',
      'i want to sign in',
      'how to login',
      'how to sign in',
      'verify account',
      'access account',
      'link account',
    ],
    weight: 0.9,
  },
  // Profile
  {
    intent: IntentName.Profile,
    keywords: ['profile', 'my profile', 'my info', 'my information', 'student profile', 'account'],
    phrases: [
      'show my profile',
      'my profile',
      'my details',
      'my information',
      'student details',
      'who am i',
      'my account',
      'view profile',
      'account details',
    ],
    weight: 0.95,
  },
  // Announcements
  {
    intent: IntentName.Announcements,
    keywords: ['announcement', 'announcements', 'news', 'update', 'updates', 'notice', 'circular'],
    phrases: [
      'any announcement',
      'latest news',
      'college news',
      'important notice',
      'any update',
      'recent updates',
      'college announcement',
      'show announcements',
      'view announcements',
    ],
    weight: 0.85,
  },
  // Profile
  {
    intent: IntentName.PublicInformation,
    keywords: ['profile', 'my profile', 'my info', 'my information', 'student profile', 'account'],
    phrases: [
      'show my profile',
      'my profile',
      'my details',
      'my information',
      'student details',
      'who am i',
      'my account',
    ],
    weight: 0.85,
  },
  // Syllabus
  {
    intent: IntentName.Syllabus,
    keywords: ['syllabus', 'curriculum', 'course outline', 'topics'],
    phrases: [
      'course syllabus',
      'subject syllabus',
      'syllabus for',
      'topics covered',
      'course outline',
    ],
    weight: 0.9,
  },
  // Help
  {
    intent: IntentName.Help,
    keywords: ['help', 'menu', 'commands', 'options', 'guide'],
    phrases: [
      'what can you do',
      'what do you do',
      'how to use',
      'show me menu',
      'show options',
      'available commands',
      'all options',
      'all commands',
    ],
    weight: 0.8,
    requiredTokens: ['help', 'menu', 'commands', 'options', 'guide'],
  },
  // Greeting - lowest priority
  {
    intent: IntentName.Greeting,
    keywords: ['hi', 'hey', 'hello', 'hola', 'howdy', 'sup', 'yo'],
    phrases: [
      'good morning',
      'good evening',
      'good afternoon',
      'good night',
      'good day',
      'how are you',
      'how are you doing',
      'what\'s up',
      'whats up',
    ],
    weight: 0.5,
  },
];

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.split(/\s+/).filter((t) => t.length > 0);
}

function calculateScore(
  tokens: string[],
  normalizedText: string,
  pattern: IntentPattern,
): number {
  let score = 0;

  // Phrase matching (highest weight)
  for (const phrase of pattern.phrases) {
    if (normalizedText.includes(phrase)) {
      score += 3.0;
    }
  }

  // Token matching
  for (const token of tokens) {
    if (pattern.keywords.includes(token)) {
      score += 1.0;
    }
    // Partial matching for compound words
    for (const keyword of pattern.keywords) {
      if (keyword.length > 3 && token.includes(keyword)) {
        score += 0.8;
      }
      if (token.length > 3 && keyword.includes(token)) {
        score += 0.5;
      }
    }
  }

  // Required tokens check
  if (pattern.requiredTokens && pattern.requiredTokens.length > 0) {
    const hasAll = pattern.requiredTokens.every((rt) =>
      tokens.some((t) => t.includes(rt) || rt.includes(t)),
    );
    if (!hasAll) {
      score *= 0.3;
    }
  }

  // Exclude tokens check
  if (pattern.excludeTokens && pattern.excludeTokens.length > 0) {
    const hasExcluded = pattern.excludeTokens.some((et) =>
      tokens.some((t) => t.includes(et) || et.includes(t)),
    );
    if (hasExcluded) {
      score *= 0.2;
    }
  }

  // Apply pattern weight
  score *= pattern.weight;

  return score;
}

export interface ClassificationResult {
  intent: IntentName;
  confidence: number;
  dateExpression: string | null;
  extractedSubject: string | null;
}

/**
 * Classify user message into an intent using NLP-based scoring.
 * Returns intent, confidence, and any extracted date/subject mentions.
 */
export function classifyIntentNLP(text: string): ClassificationResult {
  const tokens = tokenize(text);
  const normalized = normalizeText(text);

  let bestIntent = IntentName.Unknown;
  let bestScore = 0;

  for (const pattern of INTENT_PATTERNS) {
    const score = calculateScore(tokens, normalized, pattern);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = pattern.intent;
    }
  }

  // Extract date expression
  const dateExpression = extractDateExpression(text);

  // Extract subject mention
  const extractedSubject = extractSubject(text);

  // If confidence is very low, mark as unknown
  const confidence = Math.min(bestScore / 3.0, 1.0);
  if (confidence < 0.1) {
    bestIntent = IntentName.Unknown;
  }

  return {
    intent: bestIntent,
    confidence,
    dateExpression,
    extractedSubject,
  };
}

/**
 * Extract subject name from user message.
 */
function extractSubject(text: string): string | null {
  const normalized = normalizeText(text);

  const knownSubjects: Array<[string, string]> = [
    ['dbms', 'DBMS'],
    ['database management', 'DBMS'],
    ['java', 'Java'],
    ['programming in java', 'Java'],
    ['operating system', 'OS'],
    ['os', 'OS'],
    ['data structures', 'DSA'],
    ['dsa', 'DSA'],
    ['computer networks', 'CN'],
    ['cn', 'CN'],
    ['software engineering', 'SE'],
    ['se', 'SE'],
    ['machine learning', 'ML'],
    ['ml', 'ML'],
    ['artificial intelligence', 'AI'],
    ['ai', 'AI'],
    ['web technology', 'Web Technology'],
    ['web development', 'Web Technology'],
    ['compiler design', 'Compiler Design'],
    ['compiler', 'Compiler Design'],
    ['discrete mathematics', 'Discrete Math'],
    ['dm', 'Discrete Math'],
    ['linear algebra', 'Mathematics'],
    ['mathematics', 'Mathematics'],
    ['physics', 'Physics'],
    ['chemistry', 'Chemistry'],
    ['electronics', 'EC'],
    ['ec', 'EC'],
    ['digital electronics', 'DE'],
    ['de', 'DE'],
    ['microprocessor', 'Microprocessor'],
    ['microprocessor and microcontroller', 'Microprocessor'],
    ['computer organization', 'CO'],
    ['co', 'CO'],
    ['theory of computation', 'TOC'],
    ['toc', 'TOC'],
    ['automata', 'Automata'],
    ['automata theory', 'Automata'],
    ['c programming', 'C Programming'],
    ['python', 'Python'],
    ['python programming', 'Python'],
    ['c++', 'C++'],
    ['cpp', 'C++'],
    ['data mining', 'Data Mining'],
    ['data science', 'Data Science'],
    ['cloud computing', 'Cloud Computing'],
    ['cloud', 'Cloud Computing'],
    ['cyber security', 'Cyber Security'],
    ['cybersecurity', 'Cyber Security'],
    ['information security', 'Cyber Security'],
    ['blockchain', 'Blockchain'],
    ['iot', 'IoT'],
    ['internet of things', 'IoT'],
    ['deep learning', 'Deep Learning'],
    ['dl', 'Deep Learning'],
    ['natural language processing', 'NLP'],
    ['nlp', 'NLP'],
    ['computer graphics', 'Computer Graphics'],
    ['graphics', 'Computer Graphics'],
    ['unix', 'Unix'],
    ['linux', 'Linux'],
    ['database', 'Database'],
    ['sql', 'SQL'],
    ['mysql', 'MySQL'],
    ['mongodb', 'MongoDB'],
    ['oracle', 'Oracle'],
    ['html', 'HTML'],
    ['css', 'CSS'],
    ['javascript', 'JavaScript'],
    ['react', 'React'],
    ['angular', 'Angular'],
    ['node', 'Node.js'],
    ['java servlet', 'Java Servlet'],
    ['jsp', 'JSP'],
    ['spring boot', 'Spring Boot'],
    ['spring', 'Spring'],
    ['tensorflow', 'TensorFlow'],
    ['keras', 'Keras'],
    ['computer vision', 'Computer Vision'],
    ['cv', 'Computer Vision'],
    ['devops', 'DevOps'],
    ['docker', 'Docker'],
    ['kubernetes', 'Kubernetes'],
    ['aws', 'AWS'],
    ['azure', 'Azure'],
    ['mobile development', 'Mobile Dev'],
    ['android', 'Android'],
    ['flutter', 'Flutter'],
    ['react native', 'React Native'],
    ['big data', 'Big Data'],
    ['hadoop', 'Hadoop'],
    ['spark', 'Spark'],
    ['ethics', 'Ethics'],
    ['professional ethics', 'Professional Ethics'],
    ['communication skills', 'Communication Skills'],
    ['soft skills', 'Soft Skills'],
    ['project management', 'Project Management'],
  ];

  for (const [keyword, displayName] of knownSubjects) {
    // Only match multi-char keywords or exact full words for single chars
    if (keyword.length <= 2) {
      // For short keywords, require word boundary (space or exact match)
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(normalized)) {
        return displayName;
      }
    } else if (normalized.includes(keyword)) {
      return displayName;
    }
  }

  return null;
}

/**
 * Legacy wrapper: classifyIntent for backward compatibility.
 */
export function classifyIntent(text: string): IntentName {
  return classifyIntentNLP(text).intent;
}
