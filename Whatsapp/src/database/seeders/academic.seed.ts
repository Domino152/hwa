import { DailyAttendance } from '../models/DailyAttendance.js';
import { Schedule } from '../models/Schedule.js';
import { Result } from '../models/Result.js';
import { College } from '../models/College.js';
import { Department } from '../models/Department.js';
import { Program } from '../models/Program.js';
import { Batch } from '../models/Batch.js';
import { Section } from '../models/Section.js';

const SEMESTER = 3;
const ACADEMIC_YEAR = '2025-2026';
const DEPARTMENT = 'CSE';
const YEAR = 4;

const SECTIONS = ['A', 'B', 'C'] as const;

// HITS CSE Semester 3 - 7 periods, 55 min each
// P1: 08:30-09:25  P2: 09:25-10:20  Break: 10:20-10:40
// P3: 10:40-11:35  P4: 11:35-12:30  Lunch: 12:30-13:20
// P5: 13:20-14:15  P6: 14:15-15:10  P7: 15:10-16:05

type PeriodEntry = {
  dayOfWeek: string;
  periodNumber: number;
  timeSlot: string;
  subject: string;
  faculty: string;
  room: string;
  type: 'lecture' | 'lab';
};

const TIME_SLOTS = [
  '08:30-09:25', '09:25-10:20', '10:40-11:35', '11:35-12:30',
  '13:20-14:15', '14:15-15:10', '15:10-16:05',
];

function p(day: string, period: number, subject: string, type: 'lecture' | 'lab' = 'lecture', room = 'Room 301'): PeriodEntry {
  return { dayOfWeek: day, periodNumber: period, timeSlot: TIME_SLOTS[period - 1]!, subject, faculty: 'TBA', room, type };
}

// ─── CSE-B (original from user) ───
const SCHEDULE_B: PeriodEntry[] = [
  p('Monday', 1, 'DE'), p('Monday', 2, 'DE'),
  p('Monday', 3, 'Discrete Mathematics'), p('Monday', 4, 'Public Speaking'),
  p('Monday', 5, 'Data Structures'), p('Monday', 6, 'Design Project'), p('Monday', 7, 'Design Project'),

  p('Tuesday', 1, 'Python Lab', 'lab', 'Lab 201'), p('Tuesday', 2, 'Python Lab', 'lab', 'Lab 201'),
  p('Tuesday', 3, 'Discrete Mathematics'), p('Tuesday', 4, 'Discrete Mathematics'),
  p('Tuesday', 5, 'DE'), p('Tuesday', 6, 'Mentor'), p('Tuesday', 7, 'DBMS'),

  p('Wednesday', 1, 'Industrial Safety'), p('Wednesday', 2, 'Industrial Safety'),
  p('Wednesday', 3, 'EVS'), p('Wednesday', 4, 'EVS'),
  p('Wednesday', 5, 'Industrial Safety'), p('Wednesday', 6, 'Library', 'lecture', 'Library'), p('Wednesday', 7, 'SEM', 'lecture', 'Seminar Hall'),

  p('Thursday', 1, 'Python'), p('Thursday', 2, 'DBMS'),
  p('Thursday', 3, 'Data Structures'), p('Thursday', 4, 'Data Structures'),
  p('Thursday', 5, 'Public Speaking'), p('Thursday', 6, 'Discrete Mathematics'), p('Thursday', 7, 'DE'),

  p('Friday', 1, 'DBMS'), p('Friday', 2, 'DBMS'),
  p('Friday', 3, 'Discrete Mathematics'), p('Friday', 4, 'Public Speaking'),
  p('Friday', 5, 'Python'), p('Friday', 6, 'Data Structures Lab', 'lab', 'Lab 201'), p('Friday', 7, 'Data Structures Lab', 'lab', 'Lab 201'),
];

// ─── CSE-A (shuffled) ───
const SCHEDULE_A: PeriodEntry[] = [
  p('Monday', 1, 'Python'), p('Monday', 2, 'Python'),
  p('Monday', 3, 'DBMS'), p('Monday', 4, 'DE'),
  p('Monday', 5, 'Discrete Mathematics'), p('Monday', 6, 'Design Project'), p('Monday', 7, 'Design Project'),

  p('Tuesday', 1, 'Data Structures Lab', 'lab', 'Lab 201'), p('Tuesday', 2, 'Data Structures Lab', 'lab', 'Lab 201'),
  p('Tuesday', 3, 'Public Speaking'), p('Tuesday', 4, 'Python'),
  p('Tuesday', 5, 'Discrete Mathematics'), p('Tuesday', 6, 'Mentor'), p('Tuesday', 7, 'DE'),

  p('Wednesday', 1, 'Industrial Safety'), p('Wednesday', 2, 'Industrial Safety'),
  p('Wednesday', 3, 'EVS'), p('Wednesday', 4, 'EVS'),
  p('Wednesday', 5, 'Industrial Safety'), p('Wednesday', 6, 'Library', 'lecture', 'Library'), p('Wednesday', 7, 'SEM', 'lecture', 'Seminar Hall'),

  p('Thursday', 1, 'DE'), p('Thursday', 2, 'Discrete Mathematics'),
  p('Thursday', 3, 'DBMS'), p('Thursday', 4, 'Python'),
  p('Thursday', 5, 'Data Structures'), p('Thursday', 6, 'Public Speaking'), p('Thursday', 7, 'Data Structures'),

  p('Friday', 1, 'Data Structures'), p('Friday', 2, 'Data Structures'),
  p('Friday', 3, 'Public Speaking'), p('Friday', 4, 'DE'),
  p('Friday', 5, 'Python'), p('Friday', 6, 'Python Lab', 'lab', 'Lab 201'), p('Friday', 7, 'Python Lab', 'lab', 'Lab 201'),
];

// ─── CSE-C (shuffled) ───
const SCHEDULE_C: PeriodEntry[] = [
  p('Monday', 1, 'Discrete Mathematics'), p('Monday', 2, 'Discrete Mathematics'),
  p('Monday', 3, 'Python'), p('Monday', 4, 'DBMS'),
  p('Monday', 5, 'Data Structures'), p('Monday', 6, 'Design Project'), p('Monday', 7, 'Design Project'),

  p('Tuesday', 1, 'Python'), p('Tuesday', 2, 'DE'),
  p('Tuesday', 3, 'Data Structures'), p('Tuesday', 4, 'Public Speaking'),
  p('Tuesday', 5, 'Discrete Mathematics'), p('Tuesday', 6, 'Mentor'), p('Tuesday', 7, 'DBMS'),

  p('Wednesday', 1, 'Industrial Safety'), p('Wednesday', 2, 'Industrial Safety'),
  p('Wednesday', 3, 'EVS'), p('Wednesday', 4, 'EVS'),
  p('Wednesday', 5, 'Industrial Safety'), p('Wednesday', 6, 'Library', 'lecture', 'Library'), p('Wednesday', 7, 'SEM', 'lecture', 'Seminar Hall'),

  p('Thursday', 1, 'DBMS'), p('Thursday', 2, 'Data Structures'),
  p('Thursday', 3, 'DE'), p('Thursday', 4, 'Discrete Mathematics'),
  p('Thursday', 5, 'Python'), p('Thursday', 6, 'Public Speaking'), p('Thursday', 7, 'Data Structures'),

  p('Friday', 1, 'Public Speaking'), p('Friday', 2, 'Python'),
  p('Friday', 3, 'DE'), p('Friday', 4, 'Data Structures'),
  p('Friday', 5, 'Discrete Mathematics'), p('Friday', 6, 'Data Structures Lab', 'lab', 'Lab 201'), p('Friday', 7, 'Data Structures Lab', 'lab', 'Lab 201'),
];

// saturday = same as monday for each section
function saturdayFromMonday(monday: PeriodEntry[]): PeriodEntry[] {
  return monday.map((e) => ({ ...e, dayOfWeek: 'Saturday' }));
}

const SCHEDULES: Record<string, PeriodEntry[]> = {
  A: [...SCHEDULE_A, ...saturdayFromMonday(SCHEDULE_A.filter((e) => e.dayOfWeek === 'Monday'))],
  B: [...SCHEDULE_B, ...saturdayFromMonday(SCHEDULE_B.filter((e) => e.dayOfWeek === 'Monday'))],
  C: [...SCHEDULE_C, ...saturdayFromMonday(SCHEDULE_C.filter((e) => e.dayOfWeek === 'Monday'))],
};

const SEED_ATTENDANCE = [
  { subject: 'Python', totalClasses: 50, attendedClasses: 45 },
  { subject: 'Data Structures', totalClasses: 50, attendedClasses: 42 },
  { subject: 'DBMS', totalClasses: 50, attendedClasses: 48 },
  { subject: 'Discrete Mathematics', totalClasses: 50, attendedClasses: 38 },
  { subject: 'DE', totalClasses: 50, attendedClasses: 40 },
  { subject: 'Public Speaking', totalClasses: 50, attendedClasses: 44 },
  { subject: 'Industrial Safety', totalClasses: 50, attendedClasses: 46 },
  { subject: 'EVS', totalClasses: 50, attendedClasses: 47 },
  { subject: 'Design Project', totalClasses: 50, attendedClasses: 43 },
];

const SEED_RESULTS = [
  { subjectCode: 'CS301', subjectName: 'Python', totalMarks: 88, totalMax: 100, percentage: 88, credits: 4, grade: 'A', gradePoints: 8.8, gpa: 8.8, cgpa: 8.8 },
  { subjectCode: 'CS302', subjectName: 'Data Structures', totalMarks: 92, totalMax: 100, percentage: 92, credits: 4, grade: 'A', gradePoints: 9.2, gpa: 9.2, cgpa: 9.2 },
  { subjectCode: 'CS303', subjectName: 'DBMS', totalMarks: 85, totalMax: 100, percentage: 85, credits: 3, grade: 'A', gradePoints: 8.5, gpa: 8.5, cgpa: 8.5 },
  { subjectCode: 'CS304', subjectName: 'Discrete Mathematics', totalMarks: 78, totalMax: 100, percentage: 78, credits: 4, grade: 'B+', gradePoints: 7.8, gpa: 7.8, cgpa: 7.8 },
  { subjectCode: 'CS305', subjectName: 'DE', totalMarks: 82, totalMax: 100, percentage: 82, credits: 3, grade: 'A', gradePoints: 8.2, gpa: 8.2, cgpa: 8.2 },
  { subjectCode: 'HS301', subjectName: 'Public Speaking', totalMarks: 90, totalMax: 100, percentage: 90, credits: 2, grade: 'A+', gradePoints: 9.0, gpa: 9.0, cgpa: 9.0 },
  { subjectCode: 'HS302', subjectName: 'Industrial Safety', totalMarks: 87, totalMax: 100, percentage: 87, credits: 2, grade: 'A', gradePoints: 8.7, gpa: 8.7, cgpa: 8.7 },
  { subjectCode: 'EV301', subjectName: 'EVS', totalMarks: 91, totalMax: 100, percentage: 91, credits: 2, grade: 'A+', gradePoints: 9.1, gpa: 9.1, cgpa: 9.1 },
  { subjectCode: 'CS306', subjectName: 'Design Project', totalMarks: 86, totalMax: 100, percentage: 86, credits: 3, grade: 'A', gradePoints: 8.6, gpa: 8.6, cgpa: 8.6 },
];

function generateAttendanceDates(totalClasses: number): Date[] {
  const dates: Date[] = [];
  const startDate = new Date('2025-08-04');
  let current = new Date(startDate);
  while (dates.length < totalClasses) {
    const day = current.getDay();
    if (day === 0) {
      // Sunday
    } else if (day === 6) {
      const weekOfMonth = Math.ceil(current.getDate() / 7);
      if (weekOfMonth === 1 || weekOfMonth === 3) {
        dates.push(new Date(current));
      }
    } else {
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

  // Upsert parent entities
  const college = await College.findOneAndUpdate(
    { code: 'HITS' },
    { name: 'HITS', code: 'HITS', isActive: true },
    { upsert: true, new: true },
  );

  const department = await Department.findOneAndUpdate(
    { code: 'CSE' },
    { name: 'CSE', code: 'CSE', collegeId: college._id, isActive: true },
    { upsert: true, new: true },
  );

  const program = await Program.findOneAndUpdate(
    { code: 'BTCE' },
    { name: 'B.Tech CSE', code: 'BTCE', departmentId: department._id, degree: 'B.Tech', durationYears: 4, totalSemesters: 8, isActive: true },
    { upsert: true, new: true },
  );

  const batch = await Batch.findOneAndUpdate(
    { programId: program._id, year: 2024 },
    { programId: program._id, year: 2024, name: '2024 Batch', isActive: true },
    { upsert: true, new: true },
  );

  const sections = new Map<string, InstanceType<typeof Section>>();
  for (const name of SECTIONS) {
    const section = await Section.findOneAndUpdate(
      { batchId: batch._id, name },
      { batchId: batch._id, name, capacity: 60, isActive: true },
      { upsert: true, new: true },
    );
    sections.set(name, section);
  }

  for (const section of SECTIONS) {
    const studentId = `24CSE00${section === 'A' ? '1' : section === 'B' ? '2' : '3'}`;
    const sectionDoc = sections.get(section)!;

    for (const data of SEED_ATTENDANCE) {
      const dates = generateAttendanceDates(data.totalClasses);
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const status = i < data.attendedClasses ? 'present' : 'absent' as const;
        const exists = await DailyAttendance.findOne({
          studentId, subject: data.subject, date, semester: SEMESTER, academicYear: ACADEMIC_YEAR,
        });
        if (!exists) {
          await DailyAttendance.create({
            studentId, subject: data.subject, date, status, semester: SEMESTER, academicYear: ACADEMIC_YEAR,
          });
          attendanceCount++;
        }
      }
    }

    for (const data of SCHEDULES[section] ?? []) {
      const exists = await Schedule.findOne({
        department: DEPARTMENT, year: YEAR, section,
        dayOfWeek: data.dayOfWeek, periodNumber: data.periodNumber,
        semester: SEMESTER, academicYear: ACADEMIC_YEAR,
      });
      if (!exists) {
        await Schedule.create({
          ...data, sectionId: sectionDoc._id, department: DEPARTMENT, year: YEAR, section,
          semester: SEMESTER, academicYear: ACADEMIC_YEAR,
        });
        scheduleCount++;
      }
    }

    for (const data of SEED_RESULTS) {
      const exists = await Result.findOne({
        studentId, subjectCode: data.subjectCode, semester: SEMESTER, academicYear: ACADEMIC_YEAR,
      });
      if (!exists) {
        await Result.create({
          ...data, studentId, semester: SEMESTER, academicYear: ACADEMIC_YEAR, examType: 'final',
        });
        resultCount++;
      }
    }
  }

  console.log(`Attendance: ${attendanceCount} seeded`);
  console.log(`Schedule: ${scheduleCount} seeded`);
  console.log(`Results: ${resultCount} seeded`);
}
