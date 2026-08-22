import { apiService } from "./api";
import type { ParentRecord, ParentFormData } from "@/types/parent.types";

export const parentService = {
  getByRegisterNumber: async (registerNumber: string): Promise<ParentRecord | null> => {
    return apiService.get<ParentRecord | null>(`/parents/${encodeURIComponent(registerNumber)}`);
  },
  upsert: async (registerNumber: string, data: ParentFormData): Promise<ParentRecord> => {
    return apiService.put<ParentRecord>(`/parents/${encodeURIComponent(registerNumber)}`, data);
  },
  delete: async (registerNumber: string): Promise<void> => {
    await apiService.delete(`/parents/${encodeURIComponent(registerNumber)}`);
  },
};
