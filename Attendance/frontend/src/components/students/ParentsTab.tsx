import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParent, useUpsertParent } from "@/hooks/useStudentDetail";
import { Loader2 } from "lucide-react";
import type { ParentFormData } from "@/types/parent.types";

export function ParentsTab({ registerNumber }: { registerNumber: string }) {
  const { data: existing, isLoading } = useParent(registerNumber);
  const upsertParent = useUpsertParent(registerNumber);
  const [form, setForm] = useState<ParentFormData>({ fatherName: "", motherName: "", fatherPhone: "", motherPhone: "", guardianPhone: "", address: "" });

  useEffect(() => {
    if (existing) setForm({ fatherName: existing.fatherName, motherName: existing.motherName, fatherPhone: existing.fatherPhone, motherPhone: existing.motherPhone, guardianPhone: existing.guardianPhone ?? "", address: existing.address });
  }, [existing]);

  const update = (field: keyof ParentFormData, value: string) => setForm((p) => ({ ...p, [field]: value }));
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle>Parent Details</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Father Name</Label><Input value={form.fatherName} onChange={(e) => update("fatherName", e.target.value)} /></div>
          <div className="space-y-2"><Label>Father Phone</Label><Input value={form.fatherPhone} onChange={(e) => update("fatherPhone", e.target.value)} /></div>
          <div className="space-y-2"><Label>Mother Name</Label><Input value={form.motherName} onChange={(e) => update("motherName", e.target.value)} /></div>
          <div className="space-y-2"><Label>Mother Phone</Label><Input value={form.motherPhone} onChange={(e) => update("motherPhone", e.target.value)} /></div>
          <div className="space-y-2"><Label>Guardian Phone (optional)</Label><Input value={form.guardianPhone} onChange={(e) => update("guardianPhone", e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => update("address", e.target.value)} /></div>
        <Button onClick={() => upsertParent.mutate(form)} disabled={upsertParent.isPending}>
          {upsertParent.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save Parent Details
        </Button>
      </CardContent>
    </Card>
  );
}
