import { apiService } from "./api";
import type {
  DailyAttendanceRecord,
  DateRangeParams,
  DateRangeResponse,
  MarkDailyPayload,
} from "@/types/attendance.types";

export const attendanceService = {
  getDailyByDateRange: async (params: DateRangeParams): Promise<DailyAttendanceRecord[]> => {
    const response = await apiService.get<DateRangeResponse>(
      "/attendance/daily/date-range",
      params as unknown as Record<string, unknown>
    );
    return response.records;
  },

  markBulk: async (payload: MarkDailyPayload): Promise<{ created: number }> => {
    return apiService.post<{ created: number }>("/attendance/daily/bulk", payload);
  },
};
