import { Attendance } from '../../database/models/Attendance.js';
import { DailyAttendance } from '../../database/models/DailyAttendance.js';
import type { IAttendanceRepository, MonthlyReport, SemesterReport, AttendanceAnalytics, AttendanceSummary } from '../attendance.repository.js';
import type { AttendanceRecord, DailyAttendanceRecord } from '../types.js';

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

function toDailyRecord(doc: { studentId: string; subject: string; date: Date; status: string; markedBy: unknown; semester: number; academicYear: string; notes: string | null }): DailyAttendanceRecord {
  return {
    studentId: doc.studentId,
    subject: doc.subject,
    date: doc.date,
    status: doc.status as DailyAttendanceRecord['status'],
    markedBy: doc.markedBy ? String(doc.markedBy) : null,
    semester: doc.semester,
    academicYear: doc.academicYear,
    notes: doc.notes,
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

  // --- Daily Attendance ---

  async markDailyAttendance(record: DailyAttendanceRecord): Promise<DailyAttendanceRecord> {
    const doc = await DailyAttendance.findOneAndUpdate(
      { studentId: record.studentId, subject: record.subject, date: record.date },
      { $set: record },
      { new: true, upsert: true },
    );
    return toDailyRecord(doc);
  }

  async markBulkDailyAttendance(records: DailyAttendanceRecord[]): Promise<number> {
    let count = 0;
    for (const record of records) {
      await this.markDailyAttendance(record);
      count++;
    }
    return count;
  }

  async findDailyByStudentAndDate(studentId: string, date: Date): Promise<DailyAttendanceRecord[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const docs = await DailyAttendance.find({
      studentId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ subject: 1 });
    return docs.map(toDailyRecord);
  }

  async findDailyByStudentAndSubject(studentId: string, subject: string, startDate: Date, endDate: Date): Promise<DailyAttendanceRecord[]> {
    const docs = await DailyAttendance.find({
      studentId,
      subject,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });
    return docs.map(toDailyRecord);
  }

  async findDailyByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<DailyAttendanceRecord[]> {
    const docs = await DailyAttendance.find({
      studentId,
      semester,
      academicYear,
    }).sort({ date: 1, subject: 1 });
    return docs.map(toDailyRecord);
  }

  async findDailyByDateRange(startDate: Date, endDate: Date, semester: number, academicYear: string): Promise<DailyAttendanceRecord[]> {
    const docs = await DailyAttendance.find({
      date: { $gte: startDate, $lte: endDate },
      semester,
      academicYear,
    }).sort({ studentId: 1, date: 1 });
    return docs.map(toDailyRecord);
  }

  // --- Monthly Report ---

  async getMonthlyReport(studentId: string, month: number, year: number, semester: number, academicYear: string): Promise<MonthlyReport> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const results = await DailyAttendance.aggregate([
      {
        $match: {
          studentId,
          semester,
          academicYear,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          attendedClasses: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
          },
        },
      },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const totalClasses = results[0]?.totalClasses ?? 0;
    const attendedClasses = results[0]?.attendedClasses ?? 0;

    return {
      month: `${monthNames[month - 1]} ${year}`,
      totalClasses,
      attendedClasses,
      percentage: totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0,
    };
  }

  // --- Semester Report ---

  async getSemesterReport(studentId: string, semester: number, academicYear: string): Promise<SemesterReport> {
    const docs = await DailyAttendance.find({
      studentId,
      semester,
      academicYear,
    }).sort({ subject: 1, date: 1 });

    const subjectMap = new Map<string, { total: number; attended: number }>();
    let totalClasses = 0;
    let attendedClasses = 0;

    for (const doc of docs) {
      const key = doc.subject;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, { total: 0, attended: 0 });
      }
      const entry = subjectMap.get(key)!;
      entry.total++;
      totalClasses++;
      if (doc.status === 'present' || doc.status === 'late') {
        entry.attended++;
        attendedClasses++;
      }
    }

    const subjectWise = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      totalClasses: data.total,
      attendedClasses: data.attended,
      percentage: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
    }));

    return {
      semester,
      academicYear,
      totalClasses,
      attendedClasses,
      percentage: totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0,
      subjectWise,
    };
  }

  // --- Analytics ---

  async getAttendanceAnalytics(studentId: string, semester: number, academicYear: string): Promise<AttendanceAnalytics> {
    const docs = await DailyAttendance.find({
      studentId,
      semester,
      academicYear,
    }).sort({ date: 1 });

    const subjectMap = new Map<string, { total: number; attended: number; monthlyData: Map<string, { total: number; attended: number }> }>();
    const monthlyMap = new Map<string, { total: number; attended: number }>();
    let totalClasses = 0;
    let attendedClasses = 0;

    for (const doc of docs) {
      totalClasses++;
      const isAttended = doc.status === 'present' || doc.status === 'late';
      if (isAttended) attendedClasses++;

      // Subject-wise
      if (!subjectMap.has(doc.subject)) {
        subjectMap.set(doc.subject, { total: 0, attended: 0, monthlyData: new Map() });
      }
      const subjectEntry = subjectMap.get(doc.subject)!;
      subjectEntry.total++;
      if (isAttended) subjectEntry.attended++;

      // Monthly for subject trend
      const monthKey = `${doc.date.getFullYear()}-${String(doc.date.getMonth() + 1).padStart(2, '0')}`;
      if (!subjectEntry.monthlyData.has(monthKey)) {
        subjectEntry.monthlyData.set(monthKey, { total: 0, attended: 0 });
      }
      const monthData = subjectEntry.monthlyData.get(monthKey)!;
      monthData.total++;
      if (isAttended) monthData.attended++;

      // Monthly overall
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { total: 0, attended: 0 });
      }
      const overallMonth = monthlyMap.get(monthKey)!;
      overallMonth.total++;
      if (isAttended) overallMonth.attended++;
    }

    const overallPercentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;

    const subjectWise = Array.from(subjectMap.entries()).map(([subject, data]) => {
      const percentages = Array.from(data.monthlyData.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => (v.total > 0 ? Math.round((v.attended / v.total) * 100) : 0));

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (percentages.length >= 2) {
        const recent = percentages.at(-1)!;
        const previous = percentages.at(-2)!;
        if (recent > previous + 2) trend = 'improving';
        else if (recent < previous - 2) trend = 'declining';
      }

      return {
        subject,
        percentage: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
        totalClasses: data.total,
        attendedClasses: data.attended,
        trend,
      };
    });

    const monthlyTrend = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, data]) => {
        const parts = monthKey.split('-');
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          month: `${monthNames[m - 1]} ${y}`,
          totalClasses: data.total,
          attendedClasses: data.attended,
          percentage: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
        };
      });

    let riskLevel: 'safe' | 'warning' | 'critical' = 'safe';
    if (overallPercentage < 60) riskLevel = 'critical';
    else if (overallPercentage < 75) riskLevel = 'warning';

    return {
      studentId,
      overallPercentage,
      totalClasses,
      attendedClasses,
      subjectWise,
      monthlyTrend,
      belowThreshold: overallPercentage < 75,
      riskLevel,
    };
  }

  // --- Summary ---

  async getAttendanceSummary(studentId: string, semester: number, academicYear: string): Promise<AttendanceSummary> {
    const records = await Attendance.find({ studentId, semester, academicYear });

    let totalClassesHeld = 0;
    let totalClassesAttended = 0;
    let subjectsAbove75 = 0;
    let subjectsBelow75 = 0;

    for (const record of records) {
      totalClassesHeld += record.totalClasses;
      totalClassesAttended += record.attendedClasses;
      if (record.percentage >= 75) subjectsAbove75++;
      else subjectsBelow75++;
    }

    const overallPercentage = totalClassesHeld > 0 ? Math.round((totalClassesAttended / totalClassesHeld) * 100) : 0;

    const classesNeededFor75 = overallPercentage < 75
      ? Math.max(0, Math.ceil((0.75 * totalClassesHeld - totalClassesAttended) / 0.25))
      : 0;

    return {
      studentId,
      overallPercentage,
      totalSubjects: records.length,
      subjectsAbove75,
      subjectsBelow75,
      totalClassesHeld,
      totalClassesAttended,
      classesNeededFor75,
      currentSemester: semester,
      academicYear,
    };
  }

  // --- Below Threshold Detection ---

  async getStudentsBelowThreshold(semester: number, academicYear: string, threshold = 75): Promise<Array<{ studentId: string; percentage: number; totalClasses: number; attendedClasses: number }>> {
    const results = await Attendance.aggregate([
      { $match: { semester, academicYear } },
      {
        $group: {
          _id: '$studentId',
          totalClasses: { $sum: '$totalClasses' },
          attendedClasses: { $sum: '$attendedClasses' },
        },
      },
      {
        $addFields: {
          percentage: {
            $cond: [
              { $gt: ['$totalClasses', 0] },
              { $round: [{ $multiply: [{ $divide: ['$attendedClasses', '$totalClasses'] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
      { $match: { percentage: { $lt: threshold } } },
      { $sort: { percentage: 1 } },
    ]);

    return results.map((r) => ({
      studentId: r._id as string,
      percentage: r.percentage as number,
      totalClasses: r.totalClasses as number,
      attendedClasses: r.attendedClasses as number,
    }));
  }

  // --- History ---

  async getAttendanceHistory(studentId: string, page: number, limit: number): Promise<{ records: DailyAttendanceRecord[]; total: number }> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      DailyAttendance.find({ studentId }).sort({ date: -1 }).skip(skip).limit(limit),
      DailyAttendance.countDocuments({ studentId }),
    ]);

    return { records: docs.map(toDailyRecord), total };
  }

  // --- Faculty Marking Lookup ---

  async getFacultyMarkedRecords(facultyId: string, date: Date, semester: number, academicYear: string): Promise<DailyAttendanceRecord[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const docs = await DailyAttendance.find({
      markedBy: facultyId,
      date: { $gte: startOfDay, $lte: endOfDay },
      semester,
      academicYear,
    }).sort({ studentId: 1, subject: 1 });

    return docs.map(toDailyRecord);
  }
}
