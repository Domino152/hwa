import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendanceService";
import type { AttendanceFilters, AttendancePayload } from "@/types/attendance.types";
import { toast } from "sonner";

export const useAttendance = (filters?: AttendanceFilters, enabled = true) => {
  return useQuery({
    queryKey: ["attendance", filters],
    queryFn: () => attendanceService.getAll(filters),
    enabled,
    placeholderData: keepPreviousData,
  });
};

export const useAttendanceSessions = (department: string, year: number, section: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["attendance", "sessions", department, year, section],
    queryFn: () => attendanceService.getSessions(department, year, section),
    enabled,
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AttendancePayload) => attendanceService.mark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Attendance saved successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useAttendanceSummary = (date?: string) => {
  return useQuery({
    queryKey: ["dashboard", date],
    queryFn: () => attendanceService.getSummary(date),
  });
};
