import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendanceService";
import { studentService } from "@/services/studentService";
import type { DashboardSummary, DateRangeParams, MarkDailyPayload } from "@/types/attendance.types";
import type { ClassStudentsResponse } from "@/types/student.types";
import { SEMESTERS } from "@/types/student.types";
import { getAcademicYear, todayISO } from "@/lib/academicYear";
import { toast } from "sonner";

export const useClassStudents = (
  department: string,
  semester: number,
  section: string,
  enabled: boolean
) => {
  return useQuery({
    queryKey: ["students", "class", department, semester, section],
    queryFn: (): Promise<ClassStudentsResponse> =>
      studentService.getByClass(department, semester, section),
    enabled: enabled && !!department && !!semester && !!section,
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
      const [totalStudents, bySemester] = await Promise.all([
        studentService.count(),
        Promise.all(
          SEMESTERS.map((semester) =>
            attendanceService.getDailyByDateRange({
              startDate: today,
              endDate: today,
              semester,
              academicYear,
            })
          )
        ),
      ]);

      const records = bySemester.flat();
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
