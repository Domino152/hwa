import type { Types } from 'mongoose';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: 'student' | 'parent';
}

export interface LoginRequest {
  username: string;
  password: string;
  role: 'student' | 'parent';
}

export interface LoginResponse {
  user: {
    id: string;
    fullName: string;
    username: string;
    role: string;
    studentId: string;
    department: string;
    year: number;
    section: string;
    whatsappNumber: string | null;
  };
  token: string;
}

export interface LinkWhatsAppRequest {
  phone: string;
}

export interface LinkWhatsAppResponse {
  id: string;
  fullName: string;
  username: string;
  whatsappNumber: string;
}

export interface UserStatusResponse {
  linked: boolean;
  phone?: string;
}

export interface MeResponse {
  id: string;
  fullName: string;
  username: string;
  role: string;
  studentId: string;
  department: string;
  year: number;
  section: string;
  whatsappNumber: string | null;
}

/** Strip passwordHash from user document before sending to client. */
export function toSafeUser(doc: { _id: Types.ObjectId; fullName: string; username: string; role: string; studentId: string; department: string; year: number; section: string; whatsappNumber: string | null }) {
  return {
    id: String(doc._id),
    fullName: doc.fullName,
    username: doc.username,
    role: doc.role,
    studentId: doc.studentId,
    department: doc.department,
    year: doc.year,
    section: doc.section,
    whatsappNumber: doc.whatsappNumber,
  };
}
