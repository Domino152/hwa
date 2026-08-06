import { Attendance } from '../../database/models/Attendance.js';
import type { AttendanceResult } from '../types.js';

export class AttendanceIntegrationService {
  async getByStudentId(studentId: string): Promise<AttendanceResult> {
    const records = await Attendance.find({ studentId }).sort({ subject: 1 });

    if (records.length === 0) {
      return { records: [], overallPercentage: 0, hasData: false };
    }

    const overallTotal = records.reduce((sum, r) => sum + r.totalClasses, 0);
    const overallAttended = records.reduce((sum, r) => sum + r.attendedClasses, 0);
    const overallPercentage = overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0;

    return {
      records: records.map((r) => ({
        subject: r.subject,
        percentage: r.percentage,
        totalClasses: r.totalClasses,
        attendedClasses: r.attendedClasses,
      })),
      overallPercentage,
      hasData: true,
    };
  }
}
