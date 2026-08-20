import mongoose, { Document, Schema } from "mongoose";

export interface IStudent extends Document {
  fullName: string;
  registerNumber: string;
  department: string;
  year: number;
  section: string;
  email?: string;
  phone?: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    registerNumber: {
      type: String,
      required: [true, "Register number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
      enum: {
        values: ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT"],
        message: "Invalid department",
      },
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: [1, "Year must be at least 1"],
      max: [4, "Year cannot exceed 4"],
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      sparse: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, "Phone must be 10 digits"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [5, "Password must be at least 5 characters"],
    },
  },
  { timestamps: true }
);

export const Student = mongoose.model<IStudent>("Student", studentSchema);
