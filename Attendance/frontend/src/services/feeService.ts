import { apiService } from "./api";
import type { FeeRecord, FeeFormData } from "@/types/fee.types";

export const feeService = {
  getByRegisterNumber: async (registerNumber: string): Promise<FeeRecord | null> => {
    return apiService.get<FeeRecord | null>(`/fees/${encodeURIComponent(registerNumber)}`);
  },
  upsert: async (registerNumber: string, data: FeeFormData): Promise<FeeRecord> => {
    return apiService.put<FeeRecord>(`/fees/${encodeURIComponent(registerNumber)}`, data);
  },
  delete: async (registerNumber: string): Promise<void> => {
    await apiService.delete(`/fees/${encodeURIComponent(registerNumber)}`);
  },
};
