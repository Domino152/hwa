import { AttendanceIntegrationService } from './services/attendance.service.js';
import { FeeIntegrationService } from './services/fee.service.js';
import { ScheduleIntegrationService } from './services/schedule.service.js';
import { ResultIntegrationService } from './services/result.service.js';
import { ProfileService } from './services/profile.service.js';
import { User } from '../database/models/User.js';
import type { UserData, StudentProfileResult } from './types.js';

/**
 * IntegrationService is the single point of contact between the chatbot
 * and all backend data services. The chatbot never imports MongoDB models
 * directly — it always goes through this layer.
 */
export class IntegrationService {
  readonly attendance = new AttendanceIntegrationService();
  readonly fees = new FeeIntegrationService();
  readonly schedule = new ScheduleIntegrationService();
  readonly results = new ResultIntegrationService();
  readonly profile: ProfileService;

  constructor() {
    this.profile = new ProfileService(this.attendance, this.fees, this.schedule, this.results);
  }

  /**
   * Find a user by their linked WhatsApp phone number.
   * Returns a plain UserData object (no Mongoose document).
   */
  async findUserByPhone(phone: string): Promise<UserData | null> {
    const user = await User.findByPhone(phone);
    if (!user) return null;

    return {
      id: String(user._id),
      fullName: user.fullName,
      role: user.role,
      studentId: user.studentId,
      department: user.department,
      year: user.year,
      section: user.section,
    };
  }

  /**
   * Get a complete student profile aggregating all academic data.
   * Delegates to ProfileService which internally calls existing domain services.
   */
  async getStudentProfile(studentId: string): Promise<StudentProfileResult> {
    return this.profile.getStudentProfile(studentId);
  }
}
