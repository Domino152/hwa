import { Request, Response, NextFunction } from "express";
import { Result } from "../models/Result";
import { ApiResponse } from "../utils/ApiResponse";

function calcGrade(pct: number): string {
  if (pct >= 90) return "O";
  if (pct >= 80) return "A+";
  if (pct >= 70) return "A";
  if (pct >= 60) return "B+";
  if (pct >= 50) return "B";
  if (pct >= 40) return "C";
  return "F";
}

function calcCGPA(results: { marksObtained: number; totalMarks: number }[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + r.marksObtained, 0);
  const max = results.reduce((sum, r) => sum + r.totalMarks, 0);
  return max > 0 ? Math.round((total / max) * 10 * 100) / 100 : 0;
}

export class ResultController {
  static async getByRegisterNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const { registerNumber } = req.params;
      const { semester } = req.query;
      const query: Record<string, unknown> = { registerNumber };
      if (semester) query.semester = Number(semester);
      const results = await Result.find(query).sort({ subject: 1 });
      const cgpa = calcCGPA(results);
      new ApiResponse(200, {
        results: results.map((r) => ({
          subject: r.subject, marksObtained: r.marksObtained, totalMarks: r.totalMarks,
          grade: r.grade, percentage: r.totalMarks > 0 ? Math.round((r.marksObtained / r.totalMarks) * 100) : 0,
          examType: r.examType,
        })),
        cgpa, totalSubjects: results.length, hasData: results.length > 0,
      }, "Results fetched").send(res);
    } catch (error) { next(error); }
  }

  static async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const { registerNumber } = req.params;
      const { results, semester, academicYear, examType } = req.body as {
        results: Array<{ subject: string; marksObtained: number; totalMarks: number }>;
        semester: number; academicYear: string; examType: "internal" | "external" | "assignment";
      };
      const bulkOps = results.map((r) => ({
        updateOne: {
          filter: { registerNumber, subject: r.subject, semester, academicYear, examType },
          update: { $set: {
            registerNumber, subject: r.subject, marksObtained: r.marksObtained, totalMarks: r.totalMarks,
            grade: calcGrade(Math.round((r.marksObtained / r.totalMarks) * 100)),
            semester, academicYear, examType,
          }},
          upsert: true as const,
        },
      }));
      await Result.bulkWrite(bulkOps);
      const allResults = await Result.find({ registerNumber, semester, academicYear });
      const cgpa = calcCGPA(allResults);
      new ApiResponse(200, { saved: results.length, cgpa }, "Results saved").send(res);
    } catch (error) { next(error); }
  }

  static async deleteByRegisterNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const query: Record<string, unknown> = { registerNumber: req.params.registerNumber };
      if (req.query.semester) query.semester = Number(req.query.semester);
      if (req.query.subject) query.subject = req.query.subject;
      await Result.deleteMany(query);
      new ApiResponse(200, null, "Results deleted").send(res);
    } catch (error) { next(error); }
  }
}
