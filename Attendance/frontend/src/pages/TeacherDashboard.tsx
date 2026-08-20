import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { apiService } from "@/services/api";
import { Send, UserPlus, Trash2, Loader2, Copy, Check } from "lucide-react";
import type { Student } from "@/types/student.types";

const DEPARTMENTS = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT"] as const;
const YEARS = [1, 2, 3, 4] as const;
const SECTIONS = ["A", "B", "C", "D"] as const;

const studentSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(100),
  department: z.string().min(1, "Department is required"),
  year: z.number().min(1).max(4),
  section: z.string().min(1, "Section is required"),
  rollNumber: z.string().min(1, "Roll number is required"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface TeacherStudent extends Student {
  rollNumber: string;
  whatsappSent?: boolean;
}

export function TeacherDashboard() {
  const queryClient = useQueryClient();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      department: "",
      year: 1,
      section: "",
      rollNumber: "",
      phone: "",
      email: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiService.post<Student>("/students", data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      const student = response.data;
      toast.success(`Student created! Password: ${student.password}`);
      return response.data;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const sendWelcomeMutation = useMutation({
    mutationFn: (studentId: string) =>
      apiService.post(`/students/${studentId}/send-welcome`),
    onSuccess: (response) => {
      toast.success("Welcome message sent!");
    },
    onError: (error: Error) => {
      console.error("[Send Welcome] Error:", error.message);
      toast.error(`Failed to send: ${error.message}`);
    },
  });

  const onFormSubmit = async (data: StudentFormData) => {
    const payload = {
      fullName: data.fullName,
      registerNumber: data.rollNumber,
      department: data.department,
      year: data.year,
      section: data.section,
      email: data.email || undefined,
      phone: data.phone,
    };

    try {
      const response = await createMutation.mutateAsync(payload);
      const newStudent: TeacherStudent = {
        ...response.data,
        rollNumber: data.rollNumber,
        whatsappSent: false,
      };
      setStudents((prev) => [newStudent, ...prev]);
      reset();
    } catch {
      // error handled by mutation
    }
  };

  const handleSend = useCallback(
    (student: TeacherStudent) => {
      sendWelcomeMutation.mutate(student._id, {
        onSuccess: () => {
          setStudents((prev) =>
            prev.map((s) =>
              s._id === student._id ? { ...s, whatsappSent: true } : s
            )
          );
        },
      });
    },
    [sendWelcomeMutation]
  );

  const handleRemove = useCallback((id: string) => {
    setStudents((prev) => prev.filter((s) => s._id !== id));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Add students and send them WhatsApp login invites
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Add Student Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Student
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  placeholder="Enter student name"
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select
                    value={watch("department")}
                    onValueChange={(v) => setValue("department", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && (
                    <p className="text-sm text-destructive">{errors.department.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Year *</Label>
                  <Select
                    value={watch("year")?.toString()}
                    onValueChange={(v) => setValue("year", Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          Year {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.year && (
                    <p className="text-sm text-destructive">{errors.year.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Section *</Label>
                <Select
                  value={watch("section")}
                  onValueChange={(v) => setValue("section", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        Section {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.section && (
                  <p className="text-sm text-destructive">{errors.section.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollNumber">Roll Number *</Label>
                <Input
                  id="rollNumber"
                  {...register("rollNumber")}
                  placeholder="e.g. 25CU0310068"
                  className="font-mono"
                />
                {errors.rollNumber && (
                  <p className="text-sm text-destructive">{errors.rollNumber.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="10-digit number"
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="email@college.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Add Student
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Student List */}
        <Card>
          <CardHeader>
            <CardTitle>Added Students ({students.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No students added yet.</p>
                <p className="text-sm">Fill the form to add students.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {students.map((student) => (
                  <div
                    key={student._id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{student.fullName}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {student.rollNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.department} | Year {student.year} | Section {student.section}
                      </p>
                      <p className="text-sm text-muted-foreground">{student.phone}</p>
                      {student.password && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            Password: {student.password}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(student.password!);
                              setCopiedId(student._id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                          >
                            {copiedId === student._id ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {student.whatsappSent ? (
                        <Badge variant="default" className="bg-green-600">Sent</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSend(student)}
                          disabled={sendWelcomeMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(student._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
