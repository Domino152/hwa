import { apiService } from "./api";
import type { Student, StudentFilters } from "@/types/student.types";

export interface PaginatedStudents {
  data: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const studentService = {
  getAll: async (filters?: StudentFilters): Promise<PaginatedStudents> => {
    const params: Record<string, unknown> = {};
    if (filters) {
      if (filters.department) params.department = filters.department;
      if (filters.year) params.year = filters.year;
      if (filters.section) params.section = filters.section;
      if (filters.search) params.search = filters.search;
    }
    return apiService.get<PaginatedStudents>("/students", params);
  },

  count: async (filters?: StudentFilters): Promise<number> => {
    const params: Record<string, unknown> = {};
    if (filters?.department) params.department = filters.department;
    if (filters?.year) params.year = filters.year;
    if (filters?.section) params.section = filters.section;
    const response = await apiService.get<{ data: Student[] }>("/students", params);
    return response.data?.length ?? 0;
  },
};
