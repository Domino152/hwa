import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, YEARS, SECTIONS } from "@/types/student.types";
import type { Student, CreateStudentInput } from "@/types/student.types";

const studentSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(100),
  registerNumber: z.string().min(1, "Register number is required"),
  department: z.string().min(1, "Department is required"),
  year: z.number().min(1).max(4),
  section: z.string().min(1, "Section is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits").optional().or(z.literal("")),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStudentInput) => void;
  student?: Student | null;
  isLoading?: boolean;
}

export function StudentForm({ open, onClose, onSubmit, student, isLoading }: StudentFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: "",
      registerNumber: "",
      department: "",
      year: 1,
      section: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (student) {
      reset({
        fullName: student.fullName,
        registerNumber: student.registerNumber,
        department: student.department,
        year: student.year,
        section: student.section,
        email: student.email || "",
        phone: student.phone || "",
      });
    } else {
      reset({
        fullName: "",
        registerNumber: "",
        department: "",
        year: 1,
        section: "",
        email: "",
        phone: "",
      });
    }
  }, [student, reset]);

  const onFormSubmit = (data: StudentFormData) => {
    const cleanedData = {
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
    };
    onSubmit(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{student ? "Edit Student" : "Add New Student"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" {...register("fullName")} placeholder="Enter full name" />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="registerNumber">Register Number *</Label>
            <Input id="registerNumber" {...register("registerNumber")} placeholder="Enter register number" />
            {errors.registerNumber && <p className="text-sm text-destructive">{errors.registerNumber.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={watch("department")} onValueChange={(v) => setValue("department", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && <p className="text-sm text-destructive">{errors.department.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Year *</Label>
              <Select value={watch("year")?.toString()} onValueChange={(v) => setValue("year", Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>Year {year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.year && <p className="text-sm text-destructive">{errors.year.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Section *</Label>
            <Select value={watch("section")} onValueChange={(v) => setValue("section", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((sec) => (
                  <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.section && <p className="text-sm text-destructive">{errors.section.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input id="email" type="email" {...register("email")} placeholder="email@college.com" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input id="phone" {...register("phone")} placeholder="10-digit number" />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : student ? "Update" : "Add Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
