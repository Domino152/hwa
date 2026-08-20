import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClassStudents, useDailyAttendance, useMarkAttendance } from "@/hooks/useAttendance";
import { DEPARTMENTS, YEARS, SECTIONS } from "@/types/student.types";
import type { Student } from "@/types/student.types";
import { SUBJECTS } from "@/types/attendance.types";
import type { DailyStatus } from "@/types/attendance.types";
import { getAcademicYear } from "@/lib/academicYear";
import { CheckCircle, XCircle, Save, Loader2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

type AttendanceStatus = "present" | "absent";

interface CellLate {
  [studentId: string]: { minutes: number; seconds: number };
}

export function Attendance() {
  const [filters, setFilters] = useState({ department: "", year: 0, section: "" });
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [cellLate, setCellLate] = useState<CellLate>({});

  const canLoad = !!filters.department && !!filters.year && !!filters.section;
  const academicYear = getAcademicYear(new Date(date));

  const { data: classData, isLoading: rosterLoading } = useClassStudents(
    filters.department,
    filters.year,
    filters.section,
    canLoad
  );
  const { data: dailyRecords = [], isLoading: dailyLoading } = useDailyAttendance(
    canLoad && subject
      ? { startDate: date, endDate: date, semester: filters.year, academicYear }
      : null
  );
  const markMutation = useMarkAttendance();

  const students: Student[] = classData?.students ?? [];
  const dailyForSubject = useMemo(
    () => dailyRecords.filter((r) => r.subject === subject),
    [dailyRecords, subject]
  );

  useEffect(() => {
    if (students.length === 0) return;

    const initial: Record<string, AttendanceStatus> = {};
    const initialLate: CellLate = {};

    students.forEach((s) => {
      const record = dailyForSubject.find((r) => r.studentId === s._id);
      const marked = record?.status === "present" || record?.status === "late";
      initial[s._id] = marked ? "present" : "absent";
      initialLate[s._id] = { minutes: 0, seconds: 0 };
    });

    setAttendance(initial);
    setCellLate(initialLate);
  }, [students, dailyForSubject]);

  const toggleAttendance = (studentId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
  };

  const toggleAll = () => {
    const allPresent =
      students.length > 0 && students.every((s) => attendance[s.studentId] === "present");
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      updated[s.studentId] = allPresent ? "absent" : "present";
    });
    setAttendance(updated);
  };

  const markAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      updated[s.studentId] = "present";
    });
    setAttendance(updated);
  };

  const markAllAbsent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      updated[s.studentId] = "absent";
    });
    setAttendance(updated);
  };

  const handleLateChange = (studentId: string, value: string) => {
    const parts = value.split(":");
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    setCellLate((prev) => ({
      ...prev,
      [studentId]: { minutes, seconds },
    }));
  };

  const getLate = useCallback(
    (studentId: string): { minutes: number; seconds: number } => {
      return cellLate[studentId] ?? { minutes: 0, seconds: 0 };
    },
    [cellLate]
  );

  const handleSave = () => {
    if (!subject) {
      toast.error("Please select a subject");
      return;
    }

    const records = students.map((student) => {
      const late = getLate(student._id);
      const base = attendance[student._id] ?? "absent";
      const status: DailyStatus =
        late.minutes > 0 || late.seconds > 0 ? "late" : base;
      return {
        studentId: student._id,
        subject,
        date,
        status,
        semester: filters.year,
        academicYear,
      };
    });

    markMutation.mutate({ records });
  };

  const presentCount = useMemo(
    () => Object.values(attendance).filter((s) => s === "present").length,
    [attendance]
  );
  const lateCount = useMemo(
    () => Object.values(cellLate).filter((l) => l.minutes > 0 || l.seconds > 0).length,
    [cellLate]
  );
  const absentCount = students.length - presentCount - lateCount;
  const allPresent =
    students.length > 0 && students.every((s) => attendance[s.studentId] === "present");

  const isLoading = rosterLoading || dailyLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white border-b">
        <Select
          value={filters.department}
          onValueChange={(v) => setFilters((p) => ({ ...p, department: v }))}
        >
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.year?.toString() || ""}
          onValueChange={(v) => setFilters((p) => ({ ...p, year: Number(v) }))}
        >
          <SelectTrigger className="w-[110px] h-9 text-sm">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.section}
          onValueChange={(v) => setFilters((p) => ({ ...p, section: v }))}
        >
          <SelectTrigger className="w-[100px] h-9 text-sm">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            {SECTIONS.map((s) => (
              <SelectItem key={s} value={s}>Section {s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-[150px] h-9 text-sm"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Academic Year {academicYear}
        </span>
      </div>

      {students.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>{students.length} students</span>
            <span className="text-emerald-600 font-medium">{presentCount} present</span>
            <span className="text-amber-600 font-medium">{lateCount} late</span>
            <span className="text-red-600 font-medium">{absentCount} absent</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={markAllPresent}>
              <CheckCircle className="h-3 w-3 mr-1" /> All Present
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={markAllAbsent}>
              <XCircle className="h-3 w-3 mr-1" /> All Absent
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!subject || markMutation.isPending}
              onClick={handleSave}
            >
              {markMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : students.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Attendance Spreadsheet</p>
            <p className="text-sm text-gray-400 mt-1">
              Select department, semester and section to load the class
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#1e40af] text-white">
                <th className="sticky left-0 z-30 bg-[#1e40af] w-10 px-2 py-1.5 text-center font-normal border-r border-blue-700">
                  <input
                    type="checkbox"
                    checked={allPresent}
                    onChange={toggleAll}
                    className="accent-blue-500"
                  />
                </th>
                <th className="sticky left-10 z-30 bg-[#1e40af] w-[120px] px-3 py-1.5 text-left font-normal border-r border-blue-700">
                  Reg No.
                </th>
                <th className="sticky left-[10.5rem] z-30 bg-[#1e40af] w-[180px] px-3 py-1.5 text-left font-normal border-r border-blue-700">
                  Student Name
                </th>
                <th className="sticky left-[22rem] z-30 bg-[#1e40af] w-[100px] px-2 py-1.5 text-center font-normal">
                  Late (MM:SS)
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, rowIdx) => (
                <tr
                  key={student._id}
                  className={`border-b border-gray-200 ${
                    rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  } hover:bg-blue-50/50 transition-colors`}
                >
                  <td className="sticky left-0 z-10 bg-inherit px-2 py-1.5 text-center border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={attendance[student._id] === "present"}
                      onChange={() => toggleAttendance(student._id)}
                      className="accent-blue-500"
                    />
                  </td>
                  <td className="sticky left-10 z-10 bg-inherit px-3 py-1.5 font-mono text-xs border-r border-gray-200">
                    <span
                      className={
                        attendance[student._id] === "absent"
                          ? "text-red-600 font-semibold"
                          : "text-gray-900"
                      }
                    >
                      {student.registerNumber}
                    </span>
                  </td>
                  <td className="sticky left-[10.5rem] z-10 bg-inherit px-3 py-1.5 border-r border-gray-200">
                    <span className="text-gray-900">{student.fullName}</span>
                  </td>
                  <td className="sticky left-[22rem] z-10 bg-inherit px-2 py-1.5 text-center">
                    <input
                      type="text"
                      placeholder="MM:SS"
                      defaultValue={
                        (() => {
                          const late = getLate(student._id);
                          return late.minutes > 0 || late.seconds > 0
                            ? `${String(late.minutes).padStart(2, "0")}:${String(late.seconds).padStart(2, "0")}`
                            : "";
                        })()
                      }
                      onBlur={(e) => handleLateChange(student._id, e.target.value)}
                      className="w-[72px] h-7 text-center text-xs border border-gray-300 rounded px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold text-xs border-t-2 border-gray-300">
                <td className="sticky left-0 z-10 bg-gray-100 px-2 py-2 border-r border-gray-300" />
                <td className="sticky left-10 z-10 bg-gray-100 px-3 py-2 border-r border-gray-300" />
                <td className="sticky left-[10.5rem] z-10 bg-gray-100 px-3 py-2 border-r border-gray-300 text-gray-600">
                  Summary
                </td>
                <td className="sticky left-[22rem] z-10 bg-gray-100 px-2 py-2 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-emerald-600">P: {presentCount}</span>
                    <span className="text-amber-600">L: {lateCount}</span>
                    <span className="text-red-600">A: {absentCount}</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
