import mongoose from 'mongoose';
import { Attendance } from '../../database/models/Attendance.js';
import { DailyAttendance } from '../../database/models/DailyAttendance.js';
import { Student } from '../../database/models/Student.js';
import type { AttendanceRecord, AttendanceStatus, DailyAttendanceRecord } from '../types.js';
import type {
  AttendanceAnalytics,
  AttendanceSummary,
  IAttendanceRepository,
  MonthlyReport,
  SemesterReport,
} from '../../modules/attendance/attendance.service.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function mapStatus(status: string): AttendanceStatus {
  switch (status) {
    case 'present':
      return 'present';
    case 'late':
      return 'late';
    case 'od':
    case 'medical_leave':
    case 'leave':
      return 'excused';
    default:
      return 'absent';
  }
}

function toModelStatus(status: AttendanceStatus): import('../../database/models/DailyAttendance.js').AttendanceStatus {
  return status === 'excused' ? 'od' : status;
}

function toAttendanceRecord(doc: {
  studentId: string;
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  semester: number;
  academicYear: string;
}): AttendanceRecord {
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

function toDailyRecord(doc: {
  studentId: string;
  subject: string;
  date: Date;
  status: string;
  markedBy: unknown | null;
  semester: number;
  academicYear: string;
  notes: string | null;
}): DailyAttendanceRecord {
  return {
    studentId: doc.studentId,
    subject: doc.subject,
    date: doc.date,
    status: mapStatus(doc.status),
    markedBy: doc.markedBy ? String(doc.markedBy) : null,
    semester: doc.semester,
    academicYear: doc.academicYear,
    notes: doc.notes,
  };
}

function summaryStatus(percentage: number): 'good' | 'warning' | 'critical' {
  if (percentage >= 75) return 'good';
  if (percentage >= 60) return 'warning';
  return 'critical';
}

export class MongoAttendanceRepository implements IAttendanceRepository {
  // --- Aggregate ---

  async findStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
    const docs = await Attendance.find({ studentId }).sort({ subject: 1 }).exec();
    return docs.map(toAttendanceRecord);
  }

  async findByStudentAndSubject(studentId: string, subject: string): Promise<AttendanceRecord | null> {
    const doc = await Attendance.findOne({ studentId, subject }).exec();
    return doc ? toAttendanceRecord(doc) : null;
  }

  async findByStudentAndSemester(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<AttendanceRecord[]> {
    const docs = await Attendance.find({ studentId, semester, academicYear }).sort({ subject: 1 }).exec();
    return docs.map(toAttendanceRecord);
  }

  async upsertAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const doc = await Attendance.findOneAndUpdate(
      {
        studentId: record.studentId,
        subject: record.subject,
        semester: record.semester,
        academicYear: record.academicYear,
      },
      {
        $set: {
          totalClasses: record.totalClasses,
          attendedClasses: record.attendedClasses,
          percentage: record.percentage,
        },
      },
      { upsert: true, new: true },
    ).exec();
    return toAttendanceRecord(doc!);
  }

  async upsertMany(records: AttendanceRecord[]): Promise<number> {
    const operations = records.map((r) => ({
      updateOne: {
        filter: {
          studentId: r.studentId,
          subject: r.subject,
          semester: r.semester,
          academicYear: r.academicYear,
        },
        update: {
          $set: {
            totalClasses: r.totalClasses,
            attendedClasses: r.attendedClasses,
            percentage: r.percentage,
          },
        },
        upsert: true,
      },
    }));
    const result = await Attendance.bulkWrite(operations);
    return result.upsertedCount + result.modifiedCount;
  }

  async getDepartmentStats(
    department: string,
    semester: number,
    academicYear: string,
  ): Promise<Array<{ studentId: string; percentage: number; totalClasses: number; attendedClasses: number }>> {
    const students = await Student.find({ department, isActive: true }).select('studentId').exec();
    const studentIds = students.map((s) => s.studentId);
    if (studentIds.length === 0) return [];

    const records = await Attendance.find({ studentId: { $in: studentIds }, semester, academicYear }).exec();
    const map = new Map<string, { totalClasses: number; attendedClasses: number; percentage: number }>();
    for (const r of records) {
      map.set(r.studentId, {
        totalClasses: r.totalClasses,
        attendedClasses: r.attendedClasses,
        percentage: r.percentage,
      });
    }
    return studentIds
      .filter((id) => map.has(id))
      .map((id) => ({ studentId: id, ...map.get(id)! }));
  }

  // --- Daily ---

  async markDailyAttendance(record: DailyAttendanceRecord): Promise<DailyAttendanceRecord> {
    const doc = await DailyAttendance.findOneAndUpdate(
      {
        studentId: record.studentId,
        subject: record.subject,
        date: record.date,
      },
      {
        $set: {
          status: toModelStatus(record.status),
          markedBy: record.markedBy ? new mongoose.Types.ObjectId(record.markedBy) : null,
          semester: record.semester,
          academicYear: record.academicYear,
          notes: record.notes ?? null,
        },
      },
      { upsert: true, new: true },
    ).exec();
    return toDailyRecord(doc!);
  }

  async markBulkDailyAttendance(records: DailyAttendanceRecord[]): Promise<number> {
    const operations = records.map((r) => ({
      updateOne: {
        filter: {
          studentId: r.studentId,
          subject: r.subject,
          date: r.date,
        },
        update: {
          $set: {
            status: toModelStatus(r.status),
            markedBy: r.markedBy ? new mongoose.Types.ObjectId(r.markedBy) : null,
            semester: r.semester,
            academicYear: r.academicYear,
            notes: r.notes ?? null,
          },
        },
        upsert: true,
      },
    }));
    const result = await DailyAttendance.bulkWrite(operations);
    return result.upsertedCount + result.modifiedCount;
  }

  async findDailyByStudentAndDate(studentId: string, date: Date): Promise<DailyAttendanceRecord[]> {
    const docs = await DailyAttendance.find({ studentId, date }).sort({ subject: 1 }).exec();
    return docs.map(toDailyRecord);
  }

  async findDailyByStudentAndSubject(
    studentId: string,
    subject: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyAttendanceRecord[]> {
    const docs = await DailyAttendance.find({ studentId, subject, date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .exec();
    return docs.map(toDailyRecord);
  }

  async findDailyByStudentAndSemester(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<DailyAttendanceRecord[]> {
    const docs = await DailyAttendance.find({ studentId, semester, academicYear }).sort({ date: 1 }).exec();
    return docs.map(toDailyRecord);
  }

  async findDailyByDateRange(
    startDate: Date,
    endDate: Date,
    semester: number,
    academicYear: string,
  ): Promise<DailyAttendanceRecord[]> {
    const docs = await DailyAttendance.find({
      date: { $gte: startDate, $lte: endDate },
      semester,
      academicYear,
    })
      .sort({ date: 1, subject: 1 })
      .exec();
    return docs.map(toDailyRecord);
  }

  // --- Reports ---

  async getMonthlyReport(
    studentId: string,
    month: number,
    year: number,
    semester: number,
    academicYear: string,
  ): Promise<MonthlyReport> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const records = await DailyAttendance.find({ studentId, semester, academicYear, date: { $gte: start, $lt: end } }).exec();

    const subjectMap = new Map<string, { total: number; present: number }>();
    for (const r of records) {
      const entry = subjectMap.get(r.subject) ?? { total: 0, present: 0 };
      entry.total += 1;
      if (r.status === 'present' || r.status === 'late') entry.present += 1;
      subjectMap.set(r.subject, entry);
    }

    const subjectWise = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      total: data.total,
      present: data.present,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }));

    const totalClasses = records.length;
    const presentClasses = records.filter((r) => r.status === 'present' || r.status === 'late').length;
    const absentClasses = totalClasses - presentClasses;

    return {
      studentId,
      month,
      year,
      totalClasses,
      presentClasses,
      absentClasses,
      percentage: totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0,
      subjectWise,
    };
  }

  async getSemesterReport(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<SemesterReport> {
    const records = await DailyAttendance.find({ studentId, semester, academicYear }).exec();

    const subjectMap = new Map<string, { total: number; present: number }>();
    for (const r of records) {
      const entry = subjectMap.get(r.subject) ?? { total: 0, present: 0 };
      entry.total += 1;
      if (r.status === 'present' || r.status === 'late') entry.present += 1;
      subjectMap.set(r.subject, entry);
    }

    const subjectWise = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      total: data.total,
      present: data.present,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }));

    const totalClasses = records.length;
    const presentClasses = records.filter((r) => r.status === 'present' || r.status === 'late').length;
    const absentClasses = totalClasses - presentClasses;

    return {
      studentId,
      semester,
      academicYear,
      totalClasses,
      presentClasses,
      absentClasses,
      percentage: totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0,
      subjectWise,
    };
  }

  async getAttendanceAnalytics(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<AttendanceAnalytics> {
    const records = await DailyAttendance.find({ studentId, semester, academicYear }).exec();

    const monthMap = new Map<number, { total: number; present: number }>();
    const subjectMap = new Map<string, { total: number; present: number }>();
    for (const r of records) {
      const month = r.date.getUTCMonth();
      const monthEntry = monthMap.get(month) ?? { total: 0, present: 0 };
      monthEntry.total += 1;
      if (r.status === 'present' || r.status === 'late') monthEntry.present += 1;
      monthMap.set(month, monthEntry);

      const subjectEntry = subjectMap.get(r.subject) ?? { total: 0, present: 0 };
      subjectEntry.total += 1;
      if (r.status === 'present' || r.status === 'late') subjectEntry.present += 1;
      subjectMap.set(r.subject, subjectEntry);
    }

    const total = records.length;
    const present = records.filter((r) => r.status === 'present' || r.status === 'late').length;

    const trend = Array.from(monthMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([month, data]) => ({
        month: MONTHS[month] ?? String(month),
        percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      }));

    const subjectWise = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      total: data.total,
      present: data.present,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }));

    return {
      studentId,
      semester,
      academicYear,
      overall: total > 0 ? Math.round((present / total) * 100) : 0,
      trend,
      subjectWise,
    };
  }

  async getAttendanceSummary(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<AttendanceSummary> {
    const result = await DailyAttendance.getAttendanceSummary(studentId, semester, academicYear);
    const totalDays = result.total;
    const presentDays = result.present;
    const percentage = result.percentage;
    return {
      studentId,
      semester,
      academicYear,
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays,
      percentage,
      status: summaryStatus(percentage),
    };
  }

  async getStudentsBelowThreshold(
    semester: number,
    academicYear: string,
    threshold = 75,
  ): Promise<AttendanceRecord[]> {
    const docs = await Attendance.find({ semester, academicYear, percentage: { $lt: threshold } })
      .sort({ percentage: 1 })
      .exec();
    return docs.map(toAttendanceRecord);
  }

  async getAttendanceHistory(
    studentId: string,
    page: number,
    limit: number,
  ): Promise<{ records: AttendanceRecord[]; total: number }> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Attendance.find({ studentId }).sort({ subject: 1 }).skip(skip).limit(limit).exec(),
      Attendance.countDocuments({ studentId }),
    ]);
    return { records: docs.map(toAttendanceRecord), total };
  }

  async getFacultyMarkedRecords(
    facultyId: string,
    date: Date,
    semester: number,
    academicYear: string,
  ): Promise<DailyAttendanceRecord[]> {
    let objectId: mongoose.Types.ObjectId;
    try {
      objectId = new mongoose.Types.ObjectId(facultyId);
    } catch {
      return [];
    }
    const docs = await DailyAttendance.find({ markedBy: objectId, date, semester, academicYear }).exec();
    return docs.map(toDailyRecord);
  }
}
