import { apiService } from "./api";
import type { Student, CreateStudentInput, UpdateStudentInput, StudentFilters } from "@/types/student.types";

export const studentService = {
  getAll: async (filters?: StudentFilters): Promise<Student[]> => {
    const response = await apiService.get<Student[]>("/students", filters as Record<string, unknown>);
    return response.data;
  },

  getById: async (id: string): Promise<Student> => {
    const response = await apiService.get<Student>(`/students/${id}`);
    return response.data;
  },

  create: async (data: CreateStudentInput): Promise<Student> => {
    const response = await apiService.post<Student>("/students", data);
    return response.data;
  },

  update: async (id: string, data: UpdateStudentInput): Promise<Student> => {
    const response = await apiService.put<Student>(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiService.delete(`/students/${id}`);
  },
};
