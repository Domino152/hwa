import { Attendance } from '../../database/models/Attendance.js';
import type { IAttendanceRepository } from '../attendance.repository.js';
import type { AttendanceRecord } from '../types.js';

function toRecord(doc: { studentId: string; subject: string; totalClasses: number; attendedClasses: number; percentage: number; semester: number; academicYear: string }): AttendanceRecord {
  return {
    studentId: doc.studentId,
    subject: doc.subject,
    totalClasses: doc.totalClasses,
    attendedClasses: doc.attendedClasses,
    percentage: doc.percentage,
    semester: doc.semester,
    academicYear: doc.academicYear,
  };
}

export class MongoAttendanceRepository implements IAttendanceRepository {
  async findStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
    const docs = await Attendance.find({ studentId }).sort({ subject: 1 });
    return docs.map(toRecord);
  }

  async findByStudentAndSubject(studentId: string, subject: string): Promise<AttendanceRecord | null> {
    const doc = await Attendance.findOne({ studentId, subject });
    return doc ? toRecord(doc) : null;
  }

  async findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<AttendanceRecord[]> {
    const docs = await Attendance.find({ studentId, semester, academicYear }).sort({ subject: 1 });
    return docs.map(toRecord);
  }

  async upsertAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const doc = await Attendance.findOneAndUpdate(
      { studentId: record.studentId, subject: record.subject, semester: record.semester, academicYear: record.academicYear },
      { $set: record },
      { new: true, upsert: true },
    );
    return toRecord(doc);
  }

  async upsertMany(records: AttendanceRecord[]): Promise<number> {
    let count = 0;
    for (const record of records) {
      await this.upsertAttendance(record);
      count++;
    }
    return count;
  }

  async getDepartmentStats(department: string, semester: number, academicYear: string): Promise<Array<{ subject: string; averagePercentage: number; totalStudents: number }>> {
    const results = await Attendance.aggregate([
      { $match: { semester, academicYear } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: 'studentId',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      { $match: { 'student.department': department, 'student.isActive': true } },
      {
        $group: {
          _id: '$subject',
          averagePercentage: { $avg: '$percentage' },
          totalStudents: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return results.map((r) => ({
      subject: r._id as string,
      averagePercentage: Math.round(r.averagePercentage as number),
      totalStudents: r.totalStudents as number,
    }));
  }
}
