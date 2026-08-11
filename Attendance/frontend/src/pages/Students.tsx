import { useState } from "react";
import { StudentTable } from "@/components/students/StudentTable";
import { StudentFiltersBar } from "@/components/students/StudentFilters";
import { useStudents } from "@/hooks/useStudents";
import type { StudentFilters } from "@/types/student.types";

export function Students() {
  const [filters, setFilters] = useState<StudentFilters>({});

  const { data: result, isLoading } = useStudents(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Students</h1>
        <p className="text-sm text-muted-foreground">
          {result?.total ?? 0} students found
        </p>
      </div>

      <StudentFiltersBar filters={filters} onFilterChange={setFilters} />

      <StudentTable students={result?.data ?? []} isLoading={isLoading} />
    </div>
  );
}
