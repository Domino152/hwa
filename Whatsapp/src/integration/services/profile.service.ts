import type { IUserRepository } from '../../repositories/user.repository.js';
import type { AttendanceIntegrationService } from './attendance.service.js';
import type { FeeIntegrationService } from './fee.service.js';
import type { ScheduleIntegrationService } from './schedule.service.js';
import type { ResultIntegrationService } from './result.service.js';
import type { DetailedResultIntegrationService } from './detailed-result.service.js';
import type { StudentProfileResult } from '../types.js';

/**
 * ProfileService aggregates all student information into a single profile.
 * It delegates to existing domain services — no duplicated database logic.
 *
 * The chatbot (and future web portal / mobile app) calls:
 *   integration.getStudentProfile(studentId)
 */
export class ProfileService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly attendanceService: AttendanceIntegrationService,
    private readonly feesService: FeeIntegrationService,
    private readonly scheduleService: ScheduleIntegrationService,
    private readonly resultsService: ResultIntegrationService,
    private readonly detailedResultsService: DetailedResultIntegrationService,
  ) {}

  async getStudentProfile(studentId: string): Promise<StudentProfileResult> {
    const student = await this.userRepo.findByStudentId(studentId);
    if (!student) {
      return this.emptyProfile();
    }

    const parent = await this.userRepo.findParentByStudentId(studentId);

    const [attendance, fees, schedule, results, detailedResults] = await Promise.all([
      this.attendanceService.getByStudentId(studentId),
      this.feesService.getByStudentId(studentId),
      this.scheduleService.getByStudent({
        department: student.department,
        year: student.year,
        section: student.section,
      }),
      this.resultsService.getByStudentId(studentId),
      this.detailedResultsService.getByStudentId(studentId),
    ]);

    const summary = {
      attendancePercentage: attendance.overallPercentage,
      pendingFeeAmount: fees.fee?.remainingAmount ?? 0,
      cgpa: results.cgpa,
      overallCgpa: detailedResults.cgpa.cgpa,
      todayClassCount: schedule.entries.length,
    };

    const status = {
      hasAttendance: attendance.hasData,
      hasFees: fees.hasData,
      hasSchedule: schedule.hasData,
      hasResults: results.hasData,
      hasDetailedResults: detailedResults.hasData,
      hasParent: !!parent,
    };

    const currentSemester = detailedResults.cgpa.semesters.length > 0
      ? Math.max(...detailedResults.cgpa.semesters.map((s) => s.semester))
      : (results.hasData && results.results.length > 0
        ? Math.ceil(results.results.length / 5) || 1
        : 1);

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        studentId: student.studentId,
        department: student.department,
        year: student.year,
        section: student.section,
      },
      attendance,
      fees,
      schedule,
      results,
      detailedResults,
      parent: parent
        ? {
            id: parent.id,
            fullName: parent.fullName,
            whatsappNumber: parent.whatsappNumber,
          }
        : null,
      currentSemester,
      hasData: true,
      summary,
      status,
    };
  }

  private emptyProfile(): StudentProfileResult {
    return {
      student: {
        id: '',
        fullName: '',
        studentId: '',
        department: '',
        year: 0,
        section: '',
      },
      attendance: { records: [], overallPercentage: 0, hasData: false },
      fees: { fee: null, hasData: false },
      schedule: { entries: [], dayOfWeek: '', hasData: false },
      results: { results: [], cgpa: 0, hasData: false },
      detailedResults: {
        results: [],
        cgpa: { cgpa: 0, totalCredits: 0, earnedCredits: 0, totalSubjects: 0, semesters: [] },
        hasData: false,
      },
      parent: null,
      currentSemester: 1,
      hasData: false,
      summary: {
        attendancePercentage: 0,
        pendingFeeAmount: 0,
        cgpa: 0,
        overallCgpa: 0,
        todayClassCount: 0,
      },
      status: {
        hasAttendance: false,
        hasFees: false,
        hasSchedule: false,
        hasResults: false,
        hasDetailedResults: false,
        hasParent: false,
      },
    };
  }
}
