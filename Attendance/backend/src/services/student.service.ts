import { Student, IStudent } from "../models/Student";
import { ApiError } from "../utils/ApiError";

export class StudentService {
  static async createStudent(data: Partial<IStudent>): Promise<IStudent> {
    const existing = await Student.findOne({ registerNumber: data.registerNumber });
    if (existing) {
      throw new ApiError(409, "Student with this register number already exists");
    }
    const student = await Student.create(data);
    return student;
  }

  static async getStudents(filters: {
    department?: string;
    year?: number;
    section?: string;
    search?: string;
  }): Promise<IStudent[]> {
    const query: Record<string, unknown> = {};
    if (filters.department) query.department = filters.department;
    if (filters.year) query.year = filters.year;
    if (filters.section) query.section = filters.section;
    if (filters.search) {
      query.$or = [
        { fullName: { $regex: filters.search, $options: "i" } },
        { registerNumber: { $regex: filters.search, $options: "i" } },
      ];
    }
    return Student.find(query).sort({ createdAt: -1 });
  }

  static async getStudentById(id: string): Promise<IStudent> {
    const student = await Student.findById(id);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }
    return student;
  }

  static async updateStudent(
    id: string,
    data: Partial<IStudent>
  ): Promise<IStudent> {
    if (data.registerNumber) {
      const existing = await Student.findOne({
        registerNumber: data.registerNumber,
        _id: { $ne: id },
      });
      if (existing) {
        throw new ApiError(409, "Register number already in use");
      }
    }
    const student = await Student.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!student) {
      throw new ApiError(404, "Student not found");
    }
    return student;
  }

  static async deleteStudent(id: string): Promise<void> {
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }
  }
}
