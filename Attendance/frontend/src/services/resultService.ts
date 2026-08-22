import { apiService } from "./api";
import type { ResultSummary, ResultFormData } from "@/types/result.types";

export const resultService = {
  getByRegisterNumber: async (registerNumber: string, semester?: number): Promise<ResultSummary> => {
    const params: Record<string, unknown> = {};
    if (semester) params.semester = semester;
    return apiService.get<ResultSummary>(`/results/${encodeURIComponent(registerNumber)}`, params);
  },
  upsert: async (registerNumber: string, data: ResultFormData): Promise<{ saved: number; cgpa: number }> => {
    return apiService.put(`/results/${encodeURIComponent(registerNumber)}`, data);
  },
  delete: async (registerNumber: string): Promise<void> => {
    await apiService.delete(`/results/${encodeURIComponent(registerNumber)}`);
  },
};
