import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResults, useUpsertResults } from "@/hooks/useStudentDetail";
import { SUBJECTS } from "@/types/attendance.types";
import { SEMESTERS } from "@/types/student.types";
import { Loader2, Plus, Trash2 } from "lucide-react";

export function ResultsTab({ registerNumber }: { registerNumber: string }) {
  const [semester, setSemester] = useState(2);
  const [examType, setExamType] = useState<"internal" | "external" | "assignment">("internal");
  const { data: existing, isLoading } = useResults(registerNumber, semester);
  const upsertResults = useUpsertResults(registerNumber);
  const [rows, setRows] = useState<Array<{ subject: string; marksObtained: number; totalMarks: number }>>([]);
  const [academicYear, setAcademicYear] = useState("2025-26");

  useEffect(() => {
    if (existing?.hasData && existing.results.length > 0) {
      setRows(existing.results.map((r) => ({ subject: r.subject, marksObtained: r.marksObtained, totalMarks: r.totalMarks })));
    } else {
      setRows(SUBJECTS.map((s) => ({ subject: s, marksObtained: 0, totalMarks: 100 })));
    }
  }, [existing]);

  const addRow = () => setRows((p) => [...p, { subject: "", marksObtained: 0, totalMarks: 100 }]);
  const removeRow = (idx: number) => setRows((p) => p.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: string, value: string | number) => setRows((p) => p.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const totalObtained = rows.reduce((s, r) => s + r.marksObtained, 0);
  const totalMax = rows.reduce((s, r) => s + r.totalMarks, 0);
  const cgpa = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10 * 100) / 100 : 0;

  const handleSave = () => {
    const valid = rows.filter((r) => r.subject && r.totalMarks > 0);
    if (valid.length === 0) return;
    upsertResults.mutate({ results: valid, semester, academicYear, examType });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center justify-between">
        <span>Exam Results</span>
        {existing?.hasData && <span className="text-lg font-bold text-blue-600">CGPA: {cgpa.toFixed(2)}</span>}
      </CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="space-y-1"><Label className="text-xs">Semester</Label>
            <Select value={String(semester)} onValueChange={(v) => setSemester(Number(v))}>
              <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Exam Type</Label>
            <Select value={examType} onValueChange={(v) => setExamType(v as typeof examType)}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="internal">Internal</SelectItem><SelectItem value="external">External</SelectItem><SelectItem value="assignment">Assignment</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Academic Year</Label><Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-[120px] h-9 text-sm" /></div>
        </div>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="px-3 py-2 text-left font-medium w-[40px]">#</th>
              <th className="px-3 py-2 text-left font-medium">Subject</th>
              <th className="px-3 py-2 text-left font-medium w-[120px]">Marks Obtained</th>
              <th className="px-3 py-2 text-left font-medium w-[120px]">Total Marks</th>
              <th className="px-3 py-2 text-left font-medium w-[80px]">%</th>
              <th className="px-3 py-2 text-left font-medium w-[80px]">Grade</th>
              <th className="px-3 py-2 w-[50px]" />
            </tr></thead>
            <tbody>{rows.map((row, idx) => {
              const pct = row.totalMarks > 0 ? Math.round((row.marksObtained / row.totalMarks) * 100) : 0;
              const grade = pct >= 90 ? "O" : pct >= 80 ? "A+" : pct >= 70 ? "A" : pct >= 60 ? "B+" : pct >= 50 ? "B" : pct >= 40 ? "C" : "F";
              return (
                <tr key={idx} className="border-b last:border-0">
                  <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-1.5"><Input value={row.subject} onChange={(e) => updateRow(idx, "subject", e.target.value)} className="h-8 text-sm" /></td>
                  <td className="px-3 py-1.5"><Input type="number" min={0} value={row.marksObtained} onChange={(e) => updateRow(idx, "marksObtained", Number(e.target.value))} className="h-8 text-sm" /></td>
                  <td className="px-3 py-1.5"><Input type="number" min={1} value={row.totalMarks} onChange={(e) => updateRow(idx, "totalMarks", Number(e.target.value))} className="h-8 text-sm" /></td>
                  <td className="px-3 py-1.5 text-sm">{pct}%</td>
                  <td className={`px-3 py-1.5 text-sm font-medium ${pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{grade}</td>
                  <td className="px-3 py-1.5"><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeRow(idx)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-3.5 w-3.5 mr-1" /> Add Subject</Button>
          <div className="flex items-center gap-4 text-sm"><span>Total: {totalObtained}/{totalMax}</span><span className="font-bold text-blue-600">CGPA: {cgpa.toFixed(2)}</span></div>
        </div>
        <Button onClick={handleSave} disabled={upsertResults.isPending}>
          {upsertResults.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save Results
        </Button>
      </CardContent>
    </Card>
  );
}
