import { Attendance } from '../../database/models/Attendance.js';
import type { IAttendanceRepository } from '../attendance.repository.js';
import type { AttendanceRecord } from '../types.js';

export class MongoAttendanceRepository implements IAttendanceRepository {
  async findStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
    const docs = await Attendance.find({ studentId }).sort({ subject: 1 });
    return docs.map((d) => ({
      studentId: d.studentId,
      subject: d.subject,
      totalClasses: d.totalClasses,
      attendedClasses: d.attendedClasses,
      percentage: d.percentage,
      semester: d.semester,
      academicYear: d.academicYear,
    }));
  }
}
