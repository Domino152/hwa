import type { SubjectRecord } from './types.js';

export interface SubjectWithSchedule {
  subject: SubjectRecord;
  schedule: Array<{
    dayOfWeek: string;
    timeSlot: string;
    room: string;
    type: string;
    department: string;
    year: number;
    section: string;
  }>;
}

export interface SubjectWithResults {
  subject: SubjectRecord;
  results: Array<{
    studentId: string;
    semester: number;
    marksObtained: number;
    totalMarks: number;
    grade: string;
    cgpa: number;
    examType: string;
    academicYear: string;
  }>;
  stats: {
    totalStudents: number;
    averageMarks: number;
    averagePercentage: number;
    highestMarks: number;
    lowestMarks: number;
    passRate: number;
  };
}

export interface ISubjectRepository {
  findById(id: string): Promise<SubjectRecord | null>;
  findByCode(code: string): Promise<SubjectRecord | null>;
  findByDepartment(department: string): Promise<SubjectRecord[]>;
  findByDepartmentAndSemester(department: string, semester: number): Promise<SubjectRecord[]>;
  findByFaculty(faculty: string): Promise<SubjectRecord[]>;
  create(subject: Omit<SubjectRecord, 'id'>): Promise<SubjectRecord>;
  update(id: string, data: Partial<Omit<SubjectRecord, 'id'>>): Promise<SubjectRecord | null>;
  delete(id: string): Promise<boolean>;
  search(query: string): Promise<SubjectRecord[]>;
  findPrerequisites(subjectCode: string): Promise<SubjectRecord[]>;
  getScheduleForSubject(subjectCode: string): Promise<SubjectWithSchedule['schedule']>;
  getResultsForSubject(subjectCode: string, semester: number, academicYear: string): Promise<SubjectWithResults>;
}
