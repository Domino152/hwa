import { Attendance } from '../models/Attendance.js';
import { Fee } from '../models/Fee.js';
import { Schedule } from '../models/Schedule.js';
import { Result } from '../models/Result.js';

const STUDENT_ID = '22CSE001';
const SEMESTER = 8;
const ACADEMIC_YEAR = '2025-2026';

const SEED_ATTENDANCE = [
  { subject: 'DBMS', totalClasses: 50, attendedClasses: 45, percentage: 90 },
  { subject: 'Java', totalClasses: 50, attendedClasses: 42, percentage: 84 },
  { subject: 'Operating Systems', totalClasses: 50, attendedClasses: 37, percentage: 74 },
];

const SEED_FEES = [
  {
    feeType: 'Tuition Fee',
    totalFee: 100000,
    paidAmount: 85000,
    remainingAmount: 15000,
    dueDate: new Date('2026-08-15'),
    status: 'partial' as const,
  },
];

const SEED_SCHEDULE = [
  { dayOfWeek: 'Monday', periodNumber: 1, timeSlot: '09:00-10:00', subject: 'DBMS', faculty: 'Dr. Smith', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Monday', periodNumber: 2, timeSlot: '10:00-11:00', subject: 'Java', faculty: 'Dr. Brown', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Monday', periodNumber: 3, timeSlot: '11:00-12:00', subject: 'Operating Systems', faculty: 'Dr. Jones', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Monday', periodNumber: 4, timeSlot: '14:00-16:00', subject: 'DBMS Lab', faculty: 'Dr. Smith', room: 'Lab 201', type: 'lab' as const },
  { dayOfWeek: 'Tuesday', periodNumber: 1, timeSlot: '09:00-10:00', subject: 'Java', faculty: 'Dr. Brown', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Tuesday', periodNumber: 2, timeSlot: '10:00-11:00', subject: 'DBMS', faculty: 'Dr. Smith', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Tuesday', periodNumber: 3, timeSlot: '11:00-12:00', subject: 'Operating Systems', faculty: 'Dr. Jones', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Wednesday', periodNumber: 1, timeSlot: '09:00-10:00', subject: 'Operating Systems', faculty: 'Dr. Jones', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Wednesday', periodNumber: 2, timeSlot: '10:00-11:00', subject: 'DBMS', faculty: 'Dr. Smith', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Wednesday', periodNumber: 3, timeSlot: '11:00-12:00', subject: 'Java', faculty: 'Dr. Brown', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Wednesday', periodNumber: 4, timeSlot: '14:00-16:00', subject: 'Java Lab', faculty: 'Dr. Brown', room: 'Lab 201', type: 'lab' as const },
  { dayOfWeek: 'Thursday', periodNumber: 1, timeSlot: '09:00-10:00', subject: 'DBMS', faculty: 'Dr. Smith', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Thursday', periodNumber: 2, timeSlot: '10:00-11:00', subject: 'Operating Systems', faculty: 'Dr. Jones', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Thursday', periodNumber: 3, timeSlot: '11:00-12:00', subject: 'Java', faculty: 'Dr. Brown', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Friday', periodNumber: 1, timeSlot: '09:00-10:00', subject: 'Java', faculty: 'Dr. Brown', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Friday', periodNumber: 2, timeSlot: '10:00-11:00', subject: 'DBMS', faculty: 'Dr. Smith', room: 'Room 301', type: 'lecture' as const },
  { dayOfWeek: 'Friday', periodNumber: 3, timeSlot: '11:00-12:00', subject: 'Operating Systems', faculty: 'Dr. Jones', room: 'Room 301', type: 'lecture' as const },
];

const SEED_RESULTS = [
  { subject: 'DBMS', marksObtained: 92, totalMarks: 100, grade: 'A', cgpa: 9.2 },
  { subject: 'Java', marksObtained: 96, totalMarks: 100, grade: 'A+', cgpa: 9.6 },
  { subject: 'Operating Systems', marksObtained: 87, totalMarks: 100, grade: 'B+', cgpa: 8.7 },
];

export async function seedAcademic(): Promise<void> {
  let attendanceCount = 0;
  let feeCount = 0;
  let scheduleCount = 0;
  let resultCount = 0;

  for (const data of SEED_ATTENDANCE) {
    const exists = await Attendance.findOne({ studentId: STUDENT_ID, subject: data.subject, semester: SEMESTER, academicYear: ACADEMIC_YEAR });
    if (!exists) {
      await Attendance.create({ ...data, studentId: STUDENT_ID, semester: SEMESTER, academicYear: ACADEMIC_YEAR });
      attendanceCount++;
    }
  }

  for (const data of SEED_FEES) {
    const exists = await Fee.findOne({ studentId: STUDENT_ID, feeType: data.feeType, semester: SEMESTER, academicYear: ACADEMIC_YEAR });
    if (!exists) {
      await Fee.create({ ...data, studentId: STUDENT_ID, semester: SEMESTER, academicYear: ACADEMIC_YEAR });
      feeCount++;
    }
  }

  for (const data of SEED_SCHEDULE) {
    const exists = await Schedule.findOne({ department: 'CSE', year: 4, section: 'A', dayOfWeek: data.dayOfWeek, timeSlot: data.timeSlot, semester: SEMESTER, academicYear: ACADEMIC_YEAR });
    if (!exists) {
      await Schedule.create({ ...data, department: 'CSE', year: 4, section: 'A', semester: SEMESTER, academicYear: ACADEMIC_YEAR });
      scheduleCount++;
    }
  }

  for (const data of SEED_RESULTS) {
    const exists = await Result.findOne({ studentId: STUDENT_ID, subject: data.subject, semester: SEMESTER, academicYear: ACADEMIC_YEAR });
    if (!exists) {
      await Result.create({ ...data, studentId: STUDENT_ID, semester: SEMESTER, academicYear: ACADEMIC_YEAR, examType: 'final' });
      resultCount++;
    }
  }

  console.log(`✓ Attendance: ${attendanceCount} seeded`);
  console.log(`✓ Fees: ${feeCount} seeded`);
  console.log(`✓ Schedule: ${scheduleCount} seeded`);
  console.log(`✓ Results: ${resultCount} seeded`);
}
