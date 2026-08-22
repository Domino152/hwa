import { Student, IStudent } from "../models/Student";
import { ApiError } from "../utils/ApiError";

const WHATSAPP_BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3000";

const WELCOME_MESSAGE = `🎓 *Hindustan Institute of Technology and Science (HITS)*

Welcome to the HITS WhatsApp Assistant — your personal academic companion.

HITS is a deemed-to-be university located in Chennai, Tamil Nadu, India, offering undergraduate, postgraduate, and doctoral programmes across engineering, technology, science, management, architecture, and more.

━━━━━━━━━━━━━━━━━━━━━━━━
📱 *What I can help you with:*

📊 *Attendance* — Check your attendance
💰 *Fees* — View fee status and payment info
📅 *Timetable* — See your class schedule
📝 *Results* — View exam results & GPA
📢 *Announcements* — College updates & notices
👤 *Student Profile* — Access your info

━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *Important:* Official university portals, notices, and authorised HITS departments remain the final source of truth for official academic and administrative decisions.

🔐 If you are a student, type *login* to authenticate and access your personal academic information.`;

export class StudentService {
  static generatePassword(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  static async createStudent(data: Partial<IStudent>): Promise<IStudent> {
    const existing = await Student.findOne({ registerNumber: data.registerNumber });
    if (existing) {
      throw new ApiError(409, "Student with this register number already exists");
    }
    const password = data.password || this.generatePassword();
    const student = await Student.create({ ...data, password });
    return student;
  }

  static async getStudents(filters: {
    department?: string;
    year?: number;
    section?: string;
    search?: string;
  }): Promise<{ data: IStudent[]; total: number; page: number; limit: number; totalPages: number }> {
    const query: Record<string, unknown> = {};
    if (filters.department) query.department = filters.department;
    if (filters.year) query.year = filters.year;
    if (filters.section) query.section = filters.section;
    if (filters.search) {
      query.$or = [
        { fullName: { $regex: filters.search, $options: "i" } },
        { registerNumber: { $regex: filters.search, $options: "i" } },
      ];
    }
    const data = await Student.find(query).sort({ createdAt: -1 });
    const total = data.length;
    return { data, total, page: 1, limit: total, totalPages: 1 };
  }

  static async getStudentById(id: string): Promise<IStudent> {
    const student = await Student.findById(id);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }
    return student;
  }

  static async updateStudent(
    id: string,
    data: Partial<IStudent>
  ): Promise<IStudent> {
    if (data.registerNumber) {
      const existing = await Student.findOne({
        registerNumber: data.registerNumber,
        _id: { $ne: id },
      });
      if (existing) {
        throw new ApiError(409, "Register number already in use");
      }
    }
    const student = await Student.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!student) {
      throw new ApiError(404, "Student not found");
    }
    return student;
  }

  static async deleteStudent(id: string): Promise<void> {
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }
  }

  static async sendWelcomeMessage(studentId: string): Promise<{ success: boolean; messageId?: string }> {
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }

    if (!student.phone) {
      throw new ApiError(400, "Student has no phone number");
    }

    let phone = student.phone.replace(/\D/g, "");
    if (phone.length === 10) {
      phone = "91" + phone;
    }

    console.log(`[sendWelcome] Registering student ${student.registerNumber} on WhatsApp bot...`);

    try {
      const registerResponse = await fetch(`${WHATSAPP_BOT_URL}/api/v1/whatsapp/register-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          registerNumber: student.registerNumber,
          fullName: student.fullName,
          department: student.department,
          year: student.year,
          section: student.section,
          password: student.password,
        }),
      });
      const registerResult = await registerResponse.json() as Record<string, unknown>;
      console.log(`[sendWelcome] Register result:`, registerResult);
    } catch (err) {
      console.error(`[sendWelcome] Failed to register student (continuing with message):`, err);
    }

    const personalizedMessage = `${WELCOME_MESSAGE}

━━━━━━━━━━━━━━━━━━━━━━━━
🔐 *Your Login Credentials:*

📝 *Roll Number:* ${student.registerNumber}
🔑 *Password:* ${student.password}

To login, type:
*login ${student.registerNumber} ${student.password}*

━━━━━━━━━━━━━━━━━━━━━━━━`;

    console.log(`[sendWelcome] Sending to ${phone} via ${WHATSAPP_BOT_URL}`);

    const response = await fetch(`${WHATSAPP_BOT_URL}/api/v1/whatsapp/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        message: personalizedMessage,
      }),
    });

    console.log(`[sendWelcome] Response status: ${response.status}`);

    if (!response.ok) {
      let errorMsg = "Failed to send WhatsApp message";
      try {
        const errorData = await response.json() as Record<string, unknown>;
        if (errorData && typeof errorData.message === "string") {
          errorMsg = errorData.message;
        }
      } catch {
        // ignore parse error
      }
      console.log(`[sendWelcome] Error: ${errorMsg}`);
      throw new ApiError(response.status, errorMsg);
    }

    const result = await response.json() as Record<string, unknown>;
    const data = result?.data as Record<string, unknown> | undefined;
    console.log(`[sendWelcome] Success: messageId=${data?.messageId}`);
    return { success: true, messageId: data?.messageId as string | undefined };
  }
}
