import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { StudentTable } from "@/components/students/StudentTable";
import { StudentForm } from "@/components/students/StudentForm";
import { StudentFiltersBar } from "@/components/students/StudentFilters";
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent } from "@/hooks/useStudents";
import type { Student, StudentFilters, CreateStudentInput } from "@/types/student.types";
import { Plus } from "lucide-react";

export function Students() {
  const [filters, setFilters] = useState<StudentFilters>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const { data: students = [], isLoading } = useStudents(filters);
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();

  const handleCreate = useCallback(
    (data: CreateStudentInput) => {
      createMutation.mutate(data, {
        onSuccess: () => setFormOpen(false),
      });
    },
    [createMutation]
  );

  const handleUpdate = useCallback(
    (data: CreateStudentInput) => {
      if (!editingStudent) return;
      updateMutation.mutate(
        { id: editingStudent._id, data },
        { onSuccess: () => { setFormOpen(false); setEditingStudent(null); } }
      );
    },
    [editingStudent, updateMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleEdit = useCallback((student: Student) => {
    setEditingStudent(student);
    setFormOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingStudent(null);
    setFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditingStudent(null);
  }, []);

  const handleSubmit = editingStudent ? handleUpdate : handleCreate;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">{students.length} students registered</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      <StudentFiltersBar filters={filters} onFilterChange={setFilters} />
      
      <StudentTable
        students={students}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <StudentForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        student={editingStudent}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
