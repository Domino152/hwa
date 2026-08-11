export interface Student {
  id: string;
  studentId: string;
  registerNumber: string;
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string;
  gender: "male" | "female" | "other";
  department: string;
  program: string;
  semester: number;
  section: string;
  batch: string;
  advisor: string;
  status: "active" | "graduated" | "suspended";
  isActive: boolean;
}

export interface StudentFilters {
  department?: string;
  semester?: number;
  section?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedStudents {
  data: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClassStudentsResponse {
  students: Student[];
  total: number;
}

export const DEPARTMENTS = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT"] as const;
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const SECTIONS = ["A", "B", "C", "D"] as const;
