import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { studentService } from "@/services/studentService";
import type { StudentFilters, CreateStudentInput, UpdateStudentInput } from "@/types/student.types";
import { toast } from "sonner";

export const useStudents = (filters?: StudentFilters, enabled = true) => {
  return useQuery({
    queryKey: ["students", filters],
    queryFn: () => studentService.getAll(filters),
    enabled,
    placeholderData: keepPreviousData,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStudentInput) => studentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentInput }) =>
      studentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
