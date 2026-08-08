import { DailyAttendance } from '../models/DailyAttendance.js';
import { Schedule } from '../models/Schedule.js';
import { Result } from '../models/Result.js';

const STUDENT_ID = '22CSE001';
const SEMESTER = 8;
const ACADEMIC_YEAR = '2025-2026';

const SEED_ATTENDANCE = [
  { subject: 'DBMS', totalClasses: 50, attendedClasses: 45 },
  { subject: 'Java', totalClasses: 50, attendedClasses: 42 },
  { subject: 'Operating Systems', totalClasses: 50, attendedClasses: 37 },
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

function generateAttendanceDates(totalClasses: number): Date[] {
  const dates: Date[] = [];
  const startDate = new Date('2026-01-05');
  let current = new Date(startDate);
  while (dates.length < totalClasses) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function seedAcademic(): Promise<void> {
  let attendanceCount = 0;
  let scheduleCount = 0;
  let resultCount = 0;

  for (const data of SEED_ATTENDANCE) {
    const dates = generateAttendanceDates(data.totalClasses);
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const status = i < data.attendedClasses ? 'present' : 'absent' as const;
      const exists = await DailyAttendance.findOne({
        studentId: STUDENT_ID,
        subject: data.subject,
        date,
        semester: SEMESTER,
        academicYear: ACADEMIC_YEAR,
      });
      if (!exists) {
        await DailyAttendance.create({
          studentId: STUDENT_ID,
          subject: data.subject,
          date,
          status,
          semester: SEMESTER,
          academicYear: ACADEMIC_YEAR,
        });
        attendanceCount++;
      }
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
  console.log(`✓ Schedule: ${scheduleCount} seeded`);
  console.log(`✓ Results: ${resultCount} seeded`);
}
