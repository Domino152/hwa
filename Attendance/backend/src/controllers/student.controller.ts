import { Request, Response, NextFunction } from "express";
import { StudentService } from "../services/student.service";
import { ApiResponse } from "../utils/ApiResponse";

export class StudentController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const student = await StudentService.createStudent(req.body);
      new ApiResponse(201, student, "Student created successfully").send(res);
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { department, year, section, search } = req.query;
      const students = await StudentService.getStudents({
        department: department as string,
        year: year ? Number(year) : undefined,
        section: section as string,
        search: search as string,
      });
      new ApiResponse(200, students, "Students fetched successfully").send(res);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const student = await StudentService.getStudentById(req.params.id);
      new ApiResponse(200, student, "Student fetched successfully").send(res);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const student = await StudentService.updateStudent(req.params.id, req.body);
      new ApiResponse(200, student, "Student updated successfully").send(res);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await StudentService.deleteStudent(req.params.id);
      new ApiResponse(200, null, "Student deleted successfully").send(res);
    } catch (error) {
      next(error);
    }
  }
}
