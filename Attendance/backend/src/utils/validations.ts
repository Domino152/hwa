import { z } from "zod";

export const createStudentSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(100),
  registerNumber: z.string().min(1, "Register number is required"),
  department: z.enum(["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT"]),
  year: z.number().min(1).max(4),
  section: z.string().min(1, "Section is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits").optional().or(z.literal("")),
});

export const updateStudentSchema = createStudentSchema.partial();
