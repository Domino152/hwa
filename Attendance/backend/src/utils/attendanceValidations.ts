import { z } from "zod";

const attendanceRecordSchema = z.object({
  studentId: z.string().min(1),
  registerNumber: z.string().min(1),
  studentName: z.string().min(1),
  department: z.string().min(1),
  year: z.number().min(1).max(4),
  section: z.string().min(1),
  status: z.enum(["present", "absent"]),
  lateMinutes: z.number().min(0).max(59).optional().default(0),
  lateSeconds: z.number().min(0).max(59).optional().default(0),
});

export const markAttendanceSchema = z.object({
  records: z.array(attendanceRecordSchema).min(1, "At least one record required"),
  date: z.string().min(1, "Date is required"),
  subject: z.string().min(1, "Subject is required"),
  facultyName: z.string().min(1, "Faculty name is required"),
});
