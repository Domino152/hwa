import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feeService } from "@/services/feeService";
import { parentService } from "@/services/parentService";
import { resultService } from "@/services/resultService";
import type { FeeFormData } from "@/types/fee.types";
import type { ParentFormData } from "@/types/parent.types";
import type { ResultFormData } from "@/types/result.types";
import { toast } from "sonner";

export const useFee = (registerNumber: string, enabled = true) => {
  return useQuery({
    queryKey: ["fee", registerNumber],
    queryFn: () => feeService.getByRegisterNumber(registerNumber),
    enabled,
  });
};

export const useUpsertFee = (registerNumber: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FeeFormData) => feeService.upsert(registerNumber, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fee", registerNumber] }); toast.success("Fee record saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useParent = (registerNumber: string, enabled = true) => {
  return useQuery({
    queryKey: ["parent", registerNumber],
    queryFn: () => parentService.getByRegisterNumber(registerNumber),
    enabled,
  });
};

export const useUpsertParent = (registerNumber: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ParentFormData) => parentService.upsert(registerNumber, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["parent", registerNumber] }); toast.success("Parent record saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useResults = (registerNumber: string, semester?: number, enabled = true) => {
  return useQuery({
    queryKey: ["results", registerNumber, semester],
    queryFn: () => resultService.getByRegisterNumber(registerNumber, semester),
    enabled,
  });
};

export const useUpsertResults = (registerNumber: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResultFormData) => resultService.upsert(registerNumber, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["results", registerNumber] }); toast.success("Results saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
};
