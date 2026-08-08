import { DailyAttendance, type IDailyAttendance } from '../../database/models/DailyAttendance.js';
import type { AttendanceResult } from '../types.js';

export class AttendanceIntegrationService {
  async getByStudentId(studentId: string): Promise<AttendanceResult> {
    const records = await DailyAttendance.find({ studentId }).sort({ subject: 1, date: -1 }) as unknown as IDailyAttendance[];

    if (records.length === 0) {
      return { records: [], overallPercentage: 0, hasData: false };
    }

    const subjectMap = new Map<string, { totalClasses: number; attendedClasses: number }>();
    for (const record of records) {
      const existing = subjectMap.get(record.subject) ?? { totalClasses: 0, attendedClasses: 0 };
      existing.totalClasses += 1;
      if (record.status === 'present' || record.status === 'late') {
        existing.attendedClasses += 1;
      }
      subjectMap.set(record.subject, existing);
    }

    const attendanceRecords = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      percentage: data.totalClasses > 0 ? Math.round((data.attendedClasses / data.totalClasses) * 100) : 0,
      totalClasses: data.totalClasses,
      attendedClasses: data.attendedClasses,
    }));

    const overallTotal = attendanceRecords.reduce((sum, r) => sum + r.totalClasses, 0);
    const overallAttended = attendanceRecords.reduce((sum, r) => sum + r.attendedClasses, 0);
    const overallPercentage = overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0;

    return {
      records: attendanceRecords,
      overallPercentage,
      hasData: true,
    };
  }
}
