import { describe, it, expect } from 'vitest';
import { TOOL_DEFINITIONS, getToolDeclarations, getToolNames } from '../../src/chatbot/tools/tool-definitions.js';

describe('Tool Definitions', () => {
  describe('TOOL_DEFINITIONS', () => {
    it('exports 8 tools', () => {
      expect(TOOL_DEFINITIONS).toHaveLength(8);
    });

    it('contains all expected tools', () => {
      const names = TOOL_DEFINITIONS.map((t) => t.name);
      expect(names).toContain('get_attendance');
      expect(names).toContain('get_fees');
      expect(names).toContain('get_schedule');
      expect(names).toContain('get_results');
      expect(names).toContain('get_profile');
      expect(names).toContain('get_public_information');
      expect(names).toContain('search_public_information');
      expect(names).toContain('get_announcements');
    });

    it('every tool has a name', () => {
      for (const tool of TOOL_DEFINITIONS) {
        expect(tool.name).toBeTruthy();
      }
    });

    it('every tool has a description', () => {
      for (const tool of TOOL_DEFINITIONS) {
        expect(tool.description).toBeTruthy();
        expect(tool.description!.length).toBeGreaterThan(20);
      }
    });

    it('every tool has parameters', () => {
      for (const tool of TOOL_DEFINITIONS) {
        expect(tool.parameters).toBeDefined();
      }
    });

    it('private data tools require studentId', () => {
      const privateDataTools = ['get_attendance', 'get_fees', 'get_results', 'get_profile'];
      for (const name of privateDataTools) {
        const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
        expect(tool).toBeDefined();
        expect(tool!.parameters.required).toContain('studentId');
      }
    });

    it('public information tools do not require studentId', () => {
      const publicTools = ['get_public_information', 'search_public_information'];
      for (const name of publicTools) {
        const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
        expect(tool).toBeDefined();
        expect(tool!.parameters.required).not.toContain('studentId');
      }
    });
  });

  describe('getToolDeclarations', () => {
    it('returns FunctionDeclaration[]', () => {
      const decls = getToolDeclarations();
      expect(decls).toHaveLength(8);
      for (const decl of decls) {
        expect(decl.name).toBeTruthy();
      }
    });
  });

  describe('getToolNames', () => {
    it('returns array of tool names', () => {
      const names = getToolNames();
      expect(names).toHaveLength(8);
      expect(names).toContain('get_attendance');
    });

    it('returns unique names', () => {
      const names = getToolNames();
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });
});