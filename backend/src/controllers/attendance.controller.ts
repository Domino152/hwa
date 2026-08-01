import { Request, Response, NextFunction } from "express";
import { AttendanceService } from "../services/attendance.service";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export class AttendanceController {
  static async mark(req: Request, res: Response, next: NextFunction) {
    try {
      const records = await AttendanceService.markAttendance(req.body);
      new ApiResponse(201, records, "Attendance marked successfully").send(res);
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { date, department, subject, studentId } = req.query;
      const records = await AttendanceService.getAttendance({
        date: date as string,
        department: department as string,
        subject: subject as string,
        studentId: studentId as string,
      });
      new ApiResponse(200, records, "Attendance fetched successfully").send(
        res
      );
    } catch (error) {
      next(error);
    }
  }

  static async getByStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const records = await AttendanceService.getAttendanceByStudent(
        req.params.studentId
      );
      new ApiResponse(200, records, "Student attendance fetched").send(res);
    } catch (error) {
      next(error);
    }
  }

  static async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const { department, year, section } = req.query;
      if (!department || !year || !section) {
        throw new ApiError(400, "department, year, and section are required");
      }
      const data = await AttendanceService.getAttendanceSessions({
        department: department as string,
        year: Number(year),
        section: section as string,
      });
      new ApiResponse(200, data, "Sessions fetched successfully").send(res);
    } catch (error) {
      next(error);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.query;
      const summary = await AttendanceService.getSummary(date as string);
      new ApiResponse(200, summary, "Summary fetched successfully").send(res);
    } catch (error) {
      next(error);
    }
  }
}
