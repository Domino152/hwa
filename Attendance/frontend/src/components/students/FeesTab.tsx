import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFee, useUpsertFee } from "@/hooks/useStudentDetail";
import { Loader2 } from "lucide-react";
import type { FeeFormData } from "@/types/fee.types";

export function FeesTab({ registerNumber }: { registerNumber: string }) {
  const { data: existing, isLoading } = useFee(registerNumber);
  const upsertFee = useUpsertFee(registerNumber);
  const [form, setForm] = useState<FeeFormData>({ tuitionFee: 0, hostelFee: 0, paidAmount: 0, dueDate: "", academicYear: "2025-26" });

  useEffect(() => {
    if (existing) setForm({ tuitionFee: existing.tuitionFee, hostelFee: existing.hostelFee, paidAmount: existing.paidAmount, dueDate: existing.dueDate?.split("T")[0] ?? "", academicYear: existing.academicYear });
  }, [existing]);

  const update = (field: keyof FeeFormData, value: string | number) => setForm((p) => ({ ...p, [field]: value }));
  const totalFee = form.tuitionFee + form.hostelFee;
  const remaining = totalFee - form.paidAmount;
  const status = remaining <= 0 ? "paid" : form.paidAmount > 0 ? "partial" : "pending";

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle>Fee Details</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Tuition Fee</Label><Input type="number" value={form.tuitionFee} onChange={(e) => update("tuitionFee", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Hostel Fee</Label><Input type="number" value={form.hostelFee} onChange={(e) => update("hostelFee", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Paid Amount</Label><Input type="number" value={form.paidAmount} onChange={(e) => update("paidAmount", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} /></div>
          <div className="space-y-2"><Label>Academic Year</Label><Input value={form.academicYear} onChange={(e) => update("academicYear", e.target.value)} /></div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>Total: {totalFee.toLocaleString("en-IN")}</span>
          <span>Paid: {form.paidAmount.toLocaleString("en-IN")}</span>
          <span>Remaining: {remaining.toLocaleString("en-IN")}</span>
          <span className={`font-medium ${status === "paid" ? "text-emerald-600" : status === "partial" ? "text-amber-600" : "text-red-600"}`}>{status.toUpperCase()}</span>
        </div>
        <Button onClick={() => upsertFee.mutate({ tuitionFee: form.tuitionFee, hostelFee: form.hostelFee, paidAmount: form.paidAmount, dueDate: form.dueDate, academicYear: form.academicYear })} disabled={upsertFee.isPending}>
          {upsertFee.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save Fee Details
        </Button>
      </CardContent>
    </Card>
  );
}
