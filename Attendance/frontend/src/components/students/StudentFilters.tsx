import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTMENTS, YEARS, SECTIONS } from "@/types/student.types";
import type { StudentFilters } from "@/types/student.types";
import { Search, X } from "lucide-react";

interface StudentFiltersProps {
  filters: StudentFilters;
  onFilterChange: (filters: StudentFilters) => void;
}

export function StudentFiltersBar({ filters, onFilterChange }: StudentFiltersProps) {
  const [search, setSearch] = useState(filters.search || "");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onFilterChange({ ...filters, search: value || undefined });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, register number or student ID..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={filters.department || ""}
        onValueChange={(value) => onFilterChange({ ...filters, department: value || undefined })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          {DEPARTMENTS.map((dept) => (
            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.year?.toString() || ""}
        onValueChange={(value) =>
          onFilterChange({ ...filters, year: value ? Number(value) : undefined })
        }
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map((y) => (
            <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.section || ""}
        onValueChange={(value) => onFilterChange({ ...filters, section: value || undefined })}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Section" />
        </SelectTrigger>
        <SelectContent>
          {SECTIONS.map((sec) => (
            <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(filters.department || filters.year || filters.section || filters.search) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("");
            onFilterChange({});
          }}
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
