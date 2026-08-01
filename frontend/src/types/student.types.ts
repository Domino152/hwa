export interface Student {
  _id: string;
  fullName: string;
  registerNumber: string;
  department: string;
  year: number;
  section: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateStudentInput = Omit<Student, "_id" | "createdAt" | "updatedAt">;
export type UpdateStudentInput = Partial<CreateStudentInput>;

export interface StudentFilters {
  department?: string;
  year?: number;
  section?: string;
  search?: string;
}

export const DEPARTMENTS = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT"] as const;
export const YEARS = [1, 2, 3, 4] as const;
export const SECTIONS = ["A", "B", "C", "D"] as const;
