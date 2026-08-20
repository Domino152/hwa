import { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Student } from "@/types/student.types";

interface StudentTableProps {
  students: Student[];
  isLoading?: boolean;
}

export const StudentTable = memo(function StudentTable({ students, isLoading }: StudentTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
            <TableHead>Register No.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Dept</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Section</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(5)].map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <span className="text-3xl">🎓</span>
        </div>
        <h3 className="text-lg font-semibold">No students found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Register No.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Dept</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Section</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student._id}>
              <TableCell className="font-mono text-sm">{student.registerNumber}</TableCell>
              <TableCell className="font-medium">{student.fullName}</TableCell>
              <TableCell>
                <Badge variant="outline">{student.department}</Badge>
              </TableCell>
              <TableCell>Year {student.year}</TableCell>
              <TableCell>Section {student.section}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
