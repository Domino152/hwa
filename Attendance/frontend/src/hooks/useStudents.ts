import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { studentService } from "@/services/studentService";
import type { StudentFilters } from "@/types/student.types";

export const useStudents = (filters?: StudentFilters, enabled = true) => {
  return useQuery({
    queryKey: ["students", filters],
    queryFn: () => studentService.getAll(filters),
    enabled,
    placeholderData: keepPreviousData,
  });
};
