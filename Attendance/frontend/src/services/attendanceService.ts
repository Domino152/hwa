import { apiService } from "./api";
import type { AttendanceRecord, AttendancePayload, AttendanceFilters, AttendanceSummary, SessionsResponse } from "@/types/attendance.types";

export const attendanceService = {
  mark: async (data: AttendancePayload): Promise<AttendanceRecord[]> => {
    const response = await apiService.post<AttendanceRecord[]>("/attendance", data);
    return response.data;
  },

  getAll: async (filters?: AttendanceFilters): Promise<AttendanceRecord[]> => {
    const response = await apiService.get<AttendanceRecord[]>("/attendance", filters as Record<string, unknown>);
    return response.data;
  },

  getByStudent: async (studentId: string): Promise<AttendanceRecord[]> => {
    const response = await apiService.get<AttendanceRecord[]>(`/attendance/student/${studentId}`);
    return response.data;
  },

  getSessions: async (department: string, year: number, section: string): Promise<SessionsResponse> => {
    const response = await apiService.get<SessionsResponse>("/attendance/sessions", { department, year, section });
    return response.data;
  },

  getSummary: async (date?: string): Promise<AttendanceSummary> => {
    const response = await apiService.get<AttendanceSummary>("/attendance/summary", date ? { date } : undefined);
    return response.data;
  },
};
