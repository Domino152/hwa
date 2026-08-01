import mongoose from "mongoose";
import { Attendance, IAttendance } from "../models/Attendance";
import { ApiError } from "../utils/ApiError";

export interface MarkAttendancePayload {
  records: {
    studentId: string;
    registerNumber: string;
    studentName: string;
    department: string;
    year: number;
    section: string;
    status: "present" | "absent";
    lateMinutes?: number;
    lateSeconds?: number;
  }[];
  date: string;
  subject: string;
  facultyName: string;
}

export interface SessionRecord {
  studentId: string;
  registerNumber: string;
  studentName: string;
  status: "present" | "absent";
  lateMinutes: number;
  lateSeconds: number;
}

export interface AttendanceSession {
  date: string;
  subject: string;
  records: SessionRecord[];
}

export class AttendanceService {
  static async markAttendance(
    payload: MarkAttendancePayload
  ): Promise<IAttendance[]> {
    const { records, date, subject, facultyName } = payload;
    const attendanceDate = new Date(date);

    const bulkOps = records.map((record) => ({
      updateOne: {
        filter: {
          studentId: new mongoose.Types.ObjectId(record.studentId),
          date: attendanceDate,
          subject,
        },
        update: {
          $set: {
            studentId: new mongoose.Types.ObjectId(record.studentId),
            registerNumber: record.registerNumber,
            studentName: record.studentName,
            department: record.department,
            year: record.year,
            section: record.section,
            status: record.status,
            lateMinutes: record.lateMinutes ?? 0,
            lateSeconds: record.lateSeconds ?? 0,
            date: attendanceDate,
            subject,
            facultyName,
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(bulkOps);

    return Attendance.find({
      date: attendanceDate,
      subject,
      department: records[0]?.department,
      section: records[0]?.section,
    });
  }

  static async getAttendance(filters: {
    date?: string;
    department?: string;
    subject?: string;
    studentId?: string;
  }): Promise<IAttendance[]> {
    const query: Record<string, unknown> = {};
    if (filters.date) query.date = new Date(filters.date);
    if (filters.department) query.department = filters.department;
    if (filters.subject) query.subject = filters.subject;
    if (filters.studentId) query.studentId = filters.studentId;
    return Attendance.find(query).sort({ date: -1 });
  }

  static async getAttendanceByStudent(
    studentId: string
  ): Promise<IAttendance[]> {
    return Attendance.find({ studentId }).sort({ date: -1 });
  }

  static async getAttendanceSessions(filters: {
    department: string;
    year: number;
    section: string;
  }): Promise<{ sessions: AttendanceSession[]; students: { _id: string; fullName: string; registerNumber: string }[] }> {
    const { department, year, section } = filters;

    const { Student } = await import("../models/Student");
    const students = await Student.find({ department, year, section })
      .select("fullName registerNumber")
      .sort({ registerNumber: 1 });

    const records = await Attendance.find({ department, year, section })
      .sort({ date: -1, subject: 1 });

    const sessionMap = new Map<string, AttendanceSession>();
    for (const record of records) {
      const dateStr = record.date.toISOString().split("T")[0];
      const key = `${dateStr}||${record.subject}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          date: dateStr,
          subject: record.subject,
          records: [],
        });
      }
      sessionMap.get(key)!.records.push({
        studentId: record.studentId.toString(),
        registerNumber: record.registerNumber,
        studentName: record.studentName,
        status: record.status,
        lateMinutes: record.lateMinutes ?? 0,
        lateSeconds: record.lateSeconds ?? 0,
      });
    }

    const sessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const serializedStudents = students.map((s) => ({
      _id: s._id.toString(),
      fullName: s.fullName,
      registerNumber: s.registerNumber,
    }));

    return { sessions, students: serializedStudents };
  }

  static async getSummary(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const summary = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: targetDate, $lt: nextDay },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const presentCount =
      summary.find((s) => s._id === "present")?.count || 0;
    const absentCount =
      summary.find((s) => s._id === "absent")?.count || 0;
    const totalRecords = presentCount + absentCount;

    const totalStudents = await (
      await import("../models/Student"))
      .Student.countDocuments();

    const todayRecords = await Attendance.find({
      date: { $gte: targetDate, $lt: nextDay },
    })
      .sort({ createdAt: -1 })
      .limit(20);

    return {
      totalStudents,
      presentToday: presentCount,
      absentToday: absentCount,
      attendancePercentage:
        totalRecords > 0
          ? Math.round((presentCount / totalRecords) * 100)
          : 0,
      recentRecords: todayRecords,
    };
  }
}
