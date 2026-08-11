import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDailyAttendance } from "@/hooks/useAttendance";
import { SEMESTERS } from "@/types/student.types";
import { SUBJECTS } from "@/types/attendance.types";
import { getAcademicYear, formatDate } from "@/lib/academicYear";
import { History, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

const STATUS_VARIANT: Record<string, "success" | "destructive" | "secondary"> = {
  present: "success",
  absent: "destructive",
  late: "secondary",
};

export function AttendanceHistory() {
  const [semester, setSemester] = useState(1);
  const [subject, setSubject] = useState("");
  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));
  const academicYear = getAcademicYear(new Date());

  const { data: records = [], isLoading } = useDailyAttendance({
    startDate,
    endDate,
    semester,
    academicYear,
  });

  const filtered = useMemo(
    () => records.filter((r) => !subject || r.subject === subject),
    [records, subject]
  );

  const clearFilters = () => {
    setSubject("");
    setStartDate(isoDaysAgo(30));
    setEndDate(isoDaysAgo(0));
  };

  const hasFilters = !!subject || startDate !== isoDaysAgo(30) || endDate !== isoDaysAgo(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance History</h1>
        <p className="text-sm text-muted-foreground">
          View and filter past attendance records • Academic Year {academicYear}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value || isoDaysAgo(30))}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value || isoDaysAgo(0))}
              />
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={String(semester)} onValueChange={(v) => setSemester(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Records ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record, idx) => (
                    <TableRow key={`${record.studentId}-${record.subject}-${idx}`}>
                      <TableCell className="font-mono text-sm">{record.studentId}</TableCell>
                      <TableCell>{record.subject}</TableCell>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[record.status] ?? "secondary"}>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No records found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or date range
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
