import { describe, it, expect } from 'vitest';
import {
  sectionHeader,
  bulletItem,
  progressBar,
  statusBadge,
  formatCurrency,
  formatDate,
  card,
  greetingCard,
  helpCard,
  attendanceCard,
  feesCard,
  scheduleCard,
  resultsCard,
  unknownIntentCard,
} from '../../src/chatbot/formatter.js';

describe('Formatter', () => {
  describe('sectionHeader', () => {
    it('creates header with emoji', () => {
      const header = sectionHeader('Title', '📊');
      expect(header).toContain('📊');
      expect(header).toContain('*Title*');
    });

    it('creates header without emoji', () => {
      const header = sectionHeader('Title');
      expect(header).toContain('*Title*');
    });
  });

  describe('bulletItem', () => {
    it('creates bullet with default emoji', () => {
      expect(bulletItem('text')).toBe('• text');
    });

    it('creates bullet with custom emoji', () => {
      expect(bulletItem('text', '✅')).toBe('✅ text');
    });
  });

  describe('progressBar', () => {
    it('creates visual progress bar', () => {
      const bar = progressBar(50);
      expect(bar).toContain('50%');
      expect(bar).toContain('█');
      expect(bar).toContain('░');
    });

    it('creates full bar at 100%', () => {
      const bar = progressBar(100);
      expect(bar).toContain('100%');
      expect(bar).toContain('█');
      expect(bar).not.toContain('░');
    });
  });

  describe('statusBadge', () => {
    it('returns correct badge for paid', () => {
      expect(statusBadge('paid')).toBe('✅');
    });

    it('returns correct badge for pending', () => {
      expect(statusBadge('pending')).toBe('🔴');
    });

    it('returns correct badge for partial', () => {
      expect(statusBadge('partial')).toBe('⚠️');
    });
  });

  describe('formatCurrency', () => {
    it('formats Indian currency', () => {
      expect(formatCurrency(100000)).toBe('₹1,00,000');
    });

    it('formats small amounts', () => {
      expect(formatCurrency(500)).toBe('₹500');
    });
  });

  describe('formatDate', () => {
    it('formats date in Indian format', () => {
      const date = new Date('2026-08-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('Aug');
      expect(formatted).toContain('2026');
    });
  });

  describe('card', () => {
    it('creates a card with title and lines', () => {
      const result = card('Title', ['Line 1', 'Line 2']);
      expect(result).toContain('*Title*');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });

    it('creates a card with footer', () => {
      const result = card('Title', ['Content'], 'footer text');
      expect(result).toContain('footer text');
    });
  });

  describe('greetingCard', () => {
    it('creates first-time greeting', () => {
      const result = greetingCard('Arjun', true);
      expect(result).toContain('Welcome');
      expect(result).toContain('Arjun');
      expect(result).toContain('College AI Assistant');
    });

    it('creates returning greeting', () => {
      const result = greetingCard('Arjun', false);
      expect(result).toContain('Welcome back');
      expect(result).toContain('Arjun');
    });
  });

  describe('helpCard', () => {
    it('creates help menu', () => {
      const result = helpCard();
      expect(result).toContain('Available Commands');
      expect(result).toContain('Attendance');
      expect(result).toContain('Fees');
      expect(result).toContain('Timetable');
      expect(result).toContain('Results');
    });
  });

  describe('attendanceCard', () => {
    it('creates attendance card with subjects', () => {
      const result = attendanceCard(85, [
        { subject: 'DBMS', percentage: 90, attendedClasses: 45, totalClasses: 50 },
        { subject: 'Java', percentage: 80, attendedClasses: 40, totalClasses: 50 },
      ]);
      expect(result).toContain('Attendance Summary');
      expect(result).toContain('DBMS');
      expect(result).toContain('Java');
      expect(result).toContain('90%');
    });
  });

  describe('feesCard', () => {
    it('creates fees card', () => {
      const result = feesCard({
        totalFee: 100000,
        paidAmount: 85000,
        remainingAmount: 15000,
        dueDate: new Date('2026-08-15'),
        status: 'partial',
      });
      expect(result).toContain('Fee Details');
      expect(result).toContain('1,00,000');
      expect(result).toContain('PARTIAL');
    });
  });

  describe('scheduleCard', () => {
    it('creates schedule card with entries', () => {
      const result = scheduleCard('Monday', [
        { timeSlot: '09:00 - 10:00', subject: 'DBMS', room: '301', type: 'lecture' },
      ]);
      expect(result).toContain('Monday');
      expect(result).toContain('DBMS');
      expect(result).toContain('301');
    });

    it('creates empty schedule card', () => {
      const result = scheduleCard('Monday', []);
      expect(result).toContain('No classes');
    });
  });

  describe('resultsCard', () => {
    it('creates results card with CGPA', () => {
      const result = resultsCard(
        [{ subject: 'DBMS', grade: 'A', marksObtained: 92, totalMarks: 100 }],
        9.1,
      );
      expect(result).toContain('Results');
      expect(result).toContain('DBMS');
      expect(result).toContain('CGPA: 9.10');
    });
  });

  describe('unknownIntentCard', () => {
    it('creates unknown intent guidance', () => {
      const result = unknownIntentCard();
      expect(result).toContain("didn't quite get that");
      expect(result).toContain('Attendance');
      expect(result).toContain('Fees');
      expect(result).toContain('Timetable');
    });
  });
});
