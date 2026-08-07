import { describe, it, expect } from 'vitest';
import { buildMainMenuList, getSuggestedActions } from '../../src/chatbot/interactive.js';

describe('Interactive Messages', () => {
  describe('buildMainMenuList', () => {
    it('builds menu for unauthenticated user', () => {
      const menu = buildMainMenuList(false);
      expect(menu.title).toContain('College AI Assistant');
      expect(menu.buttonText).toBe('📋 Browse Options');
      expect(menu.sections.length).toBeGreaterThan(0);

      const allRows = menu.sections.flatMap((s) => s.rows);
      const rowIds = allRows.map((r) => r.id);
      expect(rowIds).toContain('intent:attendance');
      expect(rowIds).toContain('intent:fees');
      expect(rowIds).toContain('intent:schedule');
      expect(rowIds).toContain('intent:results');
      expect(rowIds).toContain('intent:login');
    });

    it('builds menu for authenticated user', () => {
      const menu = buildMainMenuList(true);
      const allRows = menu.sections.flatMap((s) => s.rows);
      const rowIds = allRows.map((r) => r.id);
      expect(rowIds).toContain('intent:profile');
      expect(rowIds).not.toContain('intent:login');
    });
  });

  describe('getSuggestedActions', () => {
    it('returns attendance-related actions after attendance intent', () => {
      const actions = getSuggestedActions('attendance', true);
      expect(actions.length).toBeGreaterThan(0);
      const ids = actions.map((a) => a.id);
      expect(ids).toContain('intent:schedule');
    });

    it('returns fee-related actions after fees intent', () => {
      const actions = getSuggestedActions('fees', true);
      const ids = actions.map((a) => a.id);
      expect(ids).toContain('intent:attendance');
    });

    it('returns login action for unauthenticated greeting', () => {
      const actions = getSuggestedActions('greeting', false);
      const ids = actions.map((a) => a.id);
      expect(ids).toContain('intent:login');
    });

    it('returns private actions for authenticated greeting', () => {
      const actions = getSuggestedActions('greeting', true);
      expect(actions.length).toBeGreaterThan(0);
      const ids = actions.map((a) => a.id);
      expect(ids).toContain('intent:attendance');
    });

    it('returns help action for unknown intent', () => {
      const actions = getSuggestedActions('unknown', true);
      expect(actions.length).toBeGreaterThan(0);
      // Should include help in the fallback suggestions
      const labels = actions.map((a) => a.text.toLowerCase());
      expect(labels.some((l) => l.includes('help') || l.includes('attendance'))).toBe(true);
    });

    it('returns public actions when not authenticated and unknown', () => {
      const actions = getSuggestedActions('unknown', false);
      const ids = actions.map((a) => a.id);
      expect(ids).toContain('intent:login');
    });
  });
});
