import type { DetailedResultService } from '../../modules/detailed-results/detailed-result.service.js';
import type { DetailedResultResult } from '../types.js';

export class DetailedResultIntegrationService {
  constructor(private readonly service: DetailedResultService) {}

  async getByStudentId(studentId: string): Promise<DetailedResultResult> {
    const [results, cgpaResult] = await Promise.all([
      this.service.getByStudent(studentId),
      this.service.getCgpa(studentId),
    ]);

    return {
      results: results.map((r) => ({
        subjectCode: r.subjectCode,
        subjectName: r.subjectName,
        semester: r.semester,
        internalMarks: r.internalMarks,
        externalMarks: r.externalMarks,
        assignmentMarks: r.assignmentMarks,
        labMarks: r.labMarks,
        totalMarks: r.totalMarks,
        totalMax: r.totalMax,
        percentage: r.percentage,
        credits: r.credits,
        grade: r.grade,
        gradePoints: r.gradePoints,
      })),
      cgpa: {
        cgpa: cgpaResult.cgpa,
        totalCredits: cgpaResult.totalCredits,
        earnedCredits: cgpaResult.earnedCredits,
        totalSubjects: cgpaResult.totalSubjects,
        semesters: cgpaResult.semesters.map((s) => ({
          semester: s.semester,
          academicYear: s.academicYear,
          gpa: s.gpa,
          totalCredits: s.totalCredits,
          earnedCredits: s.earnedCredits,
          subjectCount: s.subjectCount,
        })),
      },
      hasData: results.length > 0,
    };
  }
}