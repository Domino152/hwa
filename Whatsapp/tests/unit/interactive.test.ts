import { describe, it, expect } from 'vitest';
import {
  buildMainMenuList,
  buildGreetingMenu,
  buildHelpMenu,
  getSuggestedActions,
} from '../../src/chatbot/interactive.js';

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
      expect(rowIds).toContain('intent:announcements');
    });

    it('builds menu for authenticated user', () => {
      const menu = buildMainMenuList(true);
      const allRows = menu.sections.flatMap((s) => s.rows);
      const rowIds = allRows.map((r) => r.id);
      expect(rowIds).toContain('intent:profile');
      expect(rowIds).toContain('intent:attendance');
      expect(rowIds).toContain('intent:fees');
      expect(rowIds).toContain('intent:schedule');
      expect(rowIds).toContain('intent:results');
      expect(rowIds).toContain('intent:announcements');
      expect(rowIds).not.toContain('intent:login');
    });

    it('has all 6 main options', () => {
      const menu = buildMainMenuList(true);
      const allRows = menu.sections.flatMap((s) => s.rows);
      const rowIds = allRows.map((r) => r.id);
      expect(rowIds).toContain('intent:attendance');
      expect(rowIds).toContain('intent:fees');
      expect(rowIds).toContain('intent:schedule');
      expect(rowIds).toContain('intent:results');
      expect(rowIds).toContain('intent:announcements');
      expect(rowIds).toContain('intent:profile');
    });

    it('all row IDs have intent: prefix', () => {
      const menu = buildMainMenuList(true);
      const allRows = menu.sections.flatMap((s) => s.rows);
      for (const row of allRows) {
        expect(row.id).toMatch(/^intent:/);
      }
    });
  });

  describe('buildGreetingMenu', () => {
    it('returns greeting text and menu', () => {
      const result = buildGreetingMenu('Arjun', false);
      expect(result.greetingText).toContain('Arjun');
      expect(result.greetingText).toContain('Welcome');
      expect(result.menu.title).toContain('College AI Assistant');
      expect(result.menu.sections.length).toBeGreaterThan(0);
    });

    it('first-time greeting includes Welcome', () => {
      const result = buildGreetingMenu('Priya', true);
      expect(result.greetingText).toContain('Welcome, Priya');
      expect(result.greetingText).toContain('College AI Assistant');
    });

    it('returning greeting includes Welcome back', () => {
      const result = buildGreetingMenu('Priya', false);
      expect(result.greetingText).toContain('Welcome back, Priya');
    });

    it('menu has all main options', () => {
      const result = buildGreetingMenu('Test', false);
      const allRows = result.menu.sections.flatMap((s) => s.rows);
      const rowIds = allRows.map((r) => r.id);
      expect(rowIds).toContain('intent:attendance');
      expect(rowIds).toContain('intent:fees');
      expect(rowIds).toContain('intent:schedule');
      expect(rowIds).toContain('intent:results');
    });
  });

  describe('buildHelpMenu', () => {
    it('returns list menu params', () => {
      const menu = buildHelpMenu(true);
      expect(menu.title).toContain('College AI Assistant');
      expect(menu.description).toContain('Choose an option');
      expect(menu.sections.length).toBeGreaterThan(0);
    });

    it('description mentions natural language', () => {
      const menu = buildHelpMenu(true);
      expect(menu.description).toContain('naturally');
    });

    it('authenticated menu has profile', () => {
      const menu = buildHelpMenu(true);
      const allRows = menu.sections.flatMap((s) => s.rows);
      const rowIds = allRows.map((r) => r.id);
      expect(rowIds).toContain('intent:profile');
    });

    it('unauthenticated menu has login', () => {
      const menu = buildHelpMenu(false);
      const allRows = menu.sections.flatMap((s) => s.rows);
      const rowIds = allRows.map((r) => r.id);
      expect(rowIds).toContain('intent:login');
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

    it('returns help action for unknown intent', () => {
      const actions = getSuggestedActions('unknown', true);
      expect(actions.length).toBeGreaterThan(0);
      const labels = actions.map((a) => a.text.toLowerCase());
      expect(labels.some((l) => l.includes('help') || l.includes('attendance'))).toBe(true);
    });

    it('returns public actions when not authenticated and unknown', () => {
      const actions = getSuggestedActions('unknown', false);
      const ids = actions.map((a) => a.id);
      expect(ids).toContain('intent:login');
    });

    it('greeting intent returns fallback actions (no longer greeting-specific)', () => {
      const actions = getSuggestedActions('greeting', true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it('help intent returns fallback actions (no longer help-specific)', () => {
      const actions = getSuggestedActions('help', true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it('all action IDs have intent: prefix', () => {
      const actions = getSuggestedActions('attendance', true);
      for (const action of actions) {
        expect(action.id).toMatch(/^intent:/);
      }
    });
  });
});
