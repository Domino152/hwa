import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudents } from "@/hooks/useStudents";
import { ArrowLeft, Loader2 } from "lucide-react";
import { FeesTab } from "@/components/students/FeesTab";
import { ParentsTab } from "@/components/students/ParentsTab";
import { ResultsTab } from "@/components/students/ResultsTab";

type Tab = "overview" | "fees" | "parents" | "results";

export function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading } = useStudents({ search: id });
  const student = data?.data?.[0];
  const registerNumber = student?.registerNumber ?? "";

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!student) return <div className="space-y-4"><Button variant="ghost" size="sm" onClick={() => navigate("/students")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button><p className="text-muted-foreground">Student not found.</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/students")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <div>
          <h1 className="text-2xl font-bold">{student.fullName}</h1>
          <p className="text-sm text-muted-foreground">{registerNumber} &middot; {student.department} &middot; Year {student.year} &middot; Section {student.section}</p>
        </div>
      </div>
      <div className="flex gap-1 border-b">
        {(["overview", "fees", "parents", "results"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "parents" ? "Parent Details" : t}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <Card><CardHeader><CardTitle>Student Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {student.fullName}</div>
            <div><span className="text-muted-foreground">Register No:</span> {student.registerNumber}</div>
            <div><span className="text-muted-foreground">Department:</span> {student.department}</div>
            <div><span className="text-muted-foreground">Year:</span> {student.year}</div>
            <div><span className="text-muted-foreground">Section:</span> {student.section}</div>
            <div><span className="text-muted-foreground">Phone:</span> {student.phone}</div>
          </CardContent>
        </Card>
      )}
      {tab === "fees" && registerNumber && <FeesTab registerNumber={registerNumber} />}
      {tab === "parents" && registerNumber && <ParentsTab registerNumber={registerNumber} />}
      {tab === "results" && registerNumber && <ResultsTab registerNumber={registerNumber} />}
    </div>
  );
}
