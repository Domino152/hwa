import type { IntegrationService } from '../../integration/integration.service.js';
import { parseNaturalDate } from '../dateParser.js';
import type { KnowledgeCategory } from '../../database/models/KnowledgeBase.js';
import logger from '../../shared/utils/logger.js';

const toolLogger = logger.child({ module: 'tool-executor' });

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

export type ToolName =
  | 'get_attendance'
  | 'get_fees'
  | 'get_schedule'
  | 'get_results'
  | 'get_profile'
  | 'get_public_information'
  | 'search_public_information'
  | 'get_announcements';

export class ToolExecutor {
  constructor(private readonly integration: IntegrationService) {}

  async execute(toolName: ToolName, args: Record<string, unknown>): Promise<ToolResult> {
    toolLogger.debug({ toolName, args }, 'Executing tool');

    try {
      switch (toolName) {
        case 'get_attendance':
          return await this.getAttendance(args);
        case 'get_fees':
          return await this.getFees(args);
        case 'get_schedule':
          return await this.getSchedule(args);
        case 'get_results':
          return await this.getResults(args);
        case 'get_profile':
          return await this.getProfile(args);
        case 'get_public_information':
          return await this.getPublicInformation(args);
        case 'search_public_information':
          return await this.searchPublicInformation(args);
        case 'get_announcements':
          return await this.getAnnouncements(args);
        default:
          return { success: false, data: null, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toolLogger.error({ toolName, args, error: message }, 'Tool execution failed');
      return { success: false, data: null, error: message };
    }
  }

  private async getAttendance(args: Record<string, unknown>): Promise<ToolResult> {
    const studentId = String(args.studentId ?? '');
    if (!studentId) return { success: false, data: null, error: 'studentId is required' };

    const result = await this.integration.attendance.getByStudentId(studentId);

    if (!result.hasData) {
      return { success: true, data: { hasData: false, message: 'No attendance records found' } };
    }

    const subject = args.subject ? String(args.subject) : undefined;
    let records = result.records;

    if (subject) {
      records = records.filter((r) => r.subject.toLowerCase().includes(subject.toLowerCase()));
    }

    return {
      success: true,
      data: {
        hasData: true,
        overallPercentage: result.overallPercentage,
        subjects: records.map((r) => ({
          subject: r.subject,
          percentage: r.percentage,
          attendedClasses: r.attendedClasses,
          totalClasses: r.totalClasses,
        })),
      },
    };
  }

  private async getFees(args: Record<string, unknown>): Promise<ToolResult> {
    const studentId = String(args.studentId ?? '');
    if (!studentId) return { success: false, data: null, error: 'studentId is required' };

    const result = await this.integration.fees.getByStudentId(studentId);

    if (!result.hasData || !result.fee) {
      return { success: true, data: { hasData: false, message: 'No fee records found' } };
    }

    return {
      success: true,
      data: {
        hasData: true,
        totalFee: result.fee.totalFee,
        paidAmount: result.fee.paidAmount,
        remainingAmount: result.fee.remainingAmount,
        dueDate: result.fee.dueDate.toISOString(),
        status: result.fee.status,
        feeType: result.fee.feeType,
      },
    };
  }

  private async getSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    const studentId = String(args.studentId ?? '');
    if (!studentId) return { success: false, data: null, error: 'studentId is required' };

    const dateExpr = args.dateExpression ? String(args.dateExpression) : undefined;
    const dateInfo = dateExpr ? parseNaturalDate(dateExpr) : undefined;

    const student = await this.integration.students.getByStudentId(studentId);
    const department = student?.department ?? 'CSE';
    const year = student ? Math.ceil(student.semester / 2) : 4;
    const section = student?.section ?? 'A';

    const result = await this.integration.schedule.getByStudent({ department, year, section });

    if (!result.hasData) {
      return { success: true, data: { hasData: false, message: 'No schedule found' } };
    }

    return {
      success: true,
      data: {
        hasData: true,
        dayOfWeek: result.dayOfWeek,
        dateLabel: dateInfo?.label ?? 'Today',
        entries: result.entries.map((e) => ({
          timeSlot: e.timeSlot,
          subject: e.subject,
          room: e.room,
          type: e.type,
        })),
      },
    };
  }

  private async getResults(args: Record<string, unknown>): Promise<ToolResult> {
    const studentId = String(args.studentId ?? '');
    if (!studentId) return { success: false, data: null, error: 'studentId is required' };

    const result = await this.integration.results.getByStudentId(studentId);

    if (!result.hasData) {
      return { success: true, data: { hasData: false, message: 'No results found' } };
    }

    return {
      success: true,
      data: {
        hasData: true,
        cgpa: result.cgpa,
        subjects: result.results.map((r) => ({
          subject: r.subject,
          grade: r.grade,
          marksObtained: r.marksObtained,
          totalMarks: r.totalMarks,
        })),
      },
    };
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const studentId = String(args.studentId ?? '');
    if (!studentId) return { success: false, data: null, error: 'studentId is required' };

    const profile = await this.integration.getStudentProfile(studentId);

    if (!profile.hasData) {
      return { success: true, data: { hasData: false, message: 'Profile not found' } };
    }

    return {
      success: true,
      data: {
        hasData: true,
        student: {
          fullName: profile.student.fullName,
          studentId: profile.student.studentId,
          department: profile.student.department,
          year: profile.student.year,
          section: profile.student.section,
        },
        summary: profile.summary,
      },
    };
  }

  private async getPublicInformation(args: Record<string, unknown>): Promise<ToolResult> {
    const category = String(args.category ?? '');
    if (!category) return { success: false, data: null, error: 'category is required' };

    const result = await this.integration.publicInformation.getByCategory(category as KnowledgeCategory);

    return {
      success: true,
      data: {
        hasData: result.hasData,
        category: result.category,
        entries: result.entries.map((e) => ({
          title: e.title,
          content: e.content,
        })),
      },
    };
  }

  private async searchPublicInformation(args: Record<string, unknown>): Promise<ToolResult> {
    const query = String(args.query ?? '');
    if (!query) return { success: false, data: null, error: 'query is required' };

    const result = await this.integration.publicInformation.search(query);

    return {
      success: true,
      data: {
        hasData: result.hasData,
        category: result.category,
        entries: result.entries.map((e) => ({
          title: e.title,
          content: e.content,
          category: e.category,
        })),
      },
    };
  }

  private async getAnnouncements(args: Record<string, unknown>): Promise<ToolResult> {
    const category = args.category ? String(args.category) : 'events';
    const result = await this.integration.publicInformation.getByCategory(category as KnowledgeCategory);

    return {
      success: true,
      data: {
        hasData: result.hasData,
        entries: result.entries.map((e) => ({
          title: e.title,
          content: e.content,
          updatedAt: e.updatedAt,
        })),
      },
    };
  }
}
