import { apiService } from "./api";
import type {
  ClassStudentsResponse,
  PaginatedStudents,
  StudentFilters,
} from "@/types/student.types";

export const studentService = {
  getAll: async (filters?: StudentFilters): Promise<PaginatedStudents> => {
    const params: Record<string, unknown> = {};
    if (filters) {
      if (filters.department) params.department = filters.department;
      if (filters.semester) params.semester = filters.semester;
      if (filters.section) params.section = filters.section;
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
    }
    return apiService.get<PaginatedStudents>("/students", params);
  },

  getByClass: async (
    department: string,
    semester: number,
    section: string
  ): Promise<ClassStudentsResponse> => {
    return apiService.get<ClassStudentsResponse>(
      `/students/class/${encodeURIComponent(department)}/${semester}/${encodeURIComponent(section)}`
    );
  },

  count: async (filters?: StudentFilters): Promise<number> => {
    const params: Record<string, unknown> = {};
    if (filters?.department) params.department = filters.department;
    if (filters?.semester) params.semester = filters.semester;
    if (filters?.section) params.section = filters.section;
    const response = await apiService.get<{ total: number }>("/students/count", params);
    return response.total;
  },
};
