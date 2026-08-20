import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendanceService";
import { studentService } from "@/services/studentService";
import type { DashboardSummary, DateRangeParams, MarkDailyPayload } from "@/types/attendance.types";
import type { Student } from "@/types/student.types";
import { getAcademicYear, todayISO } from "@/lib/academicYear";
import { toast } from "sonner";

export const useClassStudents = (
  department: string,
  _semester: number,
  section: string,
  enabled: boolean
) => {
  return useQuery({
    queryKey: ["students", "class", department, section],
    queryFn: async (): Promise<{ students: Student[]; total: number }> => {
      const result = await studentService.getAll({ department, section });
      return { students: result.data, total: result.total };
    },
    enabled: enabled && !!department && !!section,
  });
};

export const useDailyAttendance = (params: DateRangeParams | null) => {
  return useQuery({
    queryKey: ["attendance", "daily", params],
    queryFn: () => attendanceService.getDailyByDateRange(params!),
    enabled: !!params,
    placeholderData: keepPreviousData,
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MarkDailyPayload) => attendanceService.markBulk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "daily"] });
      toast.success("Attendance saved successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useStudentsCount = (enabled = true) => {
  return useQuery({
    queryKey: ["students", "count"],
    queryFn: () => studentService.count(),
    enabled,
  });
};

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async (): Promise<DashboardSummary> => {
      const today = todayISO();
      const academicYear = getAcademicYear(new Date());
      const totalStudents = await studentService.count();
      const records = await attendanceService.getDailyByDateRange({
        startDate: today,
        endDate: today,
        semester: 3,
        academicYear,
      });

      let present = 0;
      let absent = 0;
      let late = 0;
      for (const r of records) {
        if (r.status === "present") present += 1;
        else if (r.status === "late") late += 1;
        else absent += 1;
      }
      const marked = present + absent + late;

      return {
        totalStudents,
        presentToday: present,
        absentToday: absent,
        lateToday: late,
        attendancePercentage: marked > 0 ? Math.round((present / marked) * 100) : 0,
        recentRecords: records.slice(0, 10),
      };
    },
  });
};
