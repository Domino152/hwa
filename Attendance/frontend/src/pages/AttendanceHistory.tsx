import { useState } from "react";
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
import { useAttendance } from "@/hooks/useAttendance";
import { DEPARTMENTS, YEARS, SECTIONS } from "@/types/student.types";
import { SUBJECTS } from "@/types/attendance.types";
import type { AttendanceFilters } from "@/types/attendance.types";
import { History, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AttendanceHistory() {
  const [filters, setFilters] = useState<AttendanceFilters>({});
  const { data: records = [], isLoading } = useAttendance(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance History</h1>
        <p className="text-sm text-muted-foreground">View and filter past attendance records</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={filters.date || ""}
                onChange={(e) => setFilters((p) => ({ ...p, date: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={filters.department || ""} onValueChange={(v) => setFilters((p) => ({ ...p, department: v || undefined }))}>
                <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={filters.subject || ""} onValueChange={(v) => setFilters((p) => ({ ...p, subject: v || undefined }))}>
                <SelectTrigger><SelectValue placeholder="All Subjects" /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {Object.keys(filters).length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
                  <X className="h-4 w-4 mr-1" />
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
            Records ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : records.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Register No.</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Late By</TableHead>
                    <TableHead>Faculty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const hasLateness = (record.lateMinutes ?? 0) > 0 || (record.lateSeconds ?? 0) > 0;
                    return (
                      <TableRow key={record._id}>
                        <TableCell className="font-mono text-sm">{record.registerNumber}</TableCell>
                        <TableCell className="font-medium">{record.studentName}</TableCell>
                        <TableCell>{record.subject}</TableCell>
                        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "present" ? "success" : "destructive"}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {hasLateness ? (
                            <span className="text-amber-600">
                              {String(record.lateMinutes ?? 0).padStart(2, "0")}:{String(record.lateSeconds ?? 0).padStart(2, "0")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.facultyName}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold">No records found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {Object.keys(filters).length > 0
                  ? "Try adjusting your filters"
                  : "Attendance records will appear here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
