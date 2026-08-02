export interface User {
  id: string;
  fullName: string;
  username: string;
  role: 'student' | 'parent';
  studentId: string;
  department: string;
  year: number;
  section: string;
  whatsappNumber: string | null;
}

export interface LoginResponse {
  user: User;
  token: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  requestId: string;
  timestamp: string;
}
