import type { AttendanceIntegrationService } from './services/attendance.service.js';
import type { FeeIntegrationService } from './services/fee.service.js';
import type { ScheduleIntegrationService } from './services/schedule.service.js';
import type { ResultIntegrationService } from './services/result.service.js';
import type { PublicInformationService } from './services/public-information.service.js';
import type { ProfileService } from './services/profile.service.js';
import type { StudentIntegrationService } from './services/student-integration.service.js';
import type { IUserRepository } from '../repositories/user.repository.js';
import type { UserData, StudentProfileResult } from './types.js';

/**
 * IntegrationService is the single point of contact between the chatbot
 * and all backend data services. The chatbot never imports MongoDB models
 * directly — it always goes through this layer.
 *
 * All sub-services and repositories are injected via constructor.
 * The composition root in index.ts wires everything together.
 */
export class IntegrationService {
  constructor(
    readonly attendance: AttendanceIntegrationService,
    readonly fees: FeeIntegrationService,
    readonly schedule: ScheduleIntegrationService,
    readonly results: ResultIntegrationService,
    readonly publicInformation: PublicInformationService,
    readonly profile: ProfileService,
    private readonly userRepo: IUserRepository,
    readonly students: StudentIntegrationService,
  ) {}

  /**
   * Find a user by their linked WhatsApp phone number.
   * Returns a plain UserData object (no Mongoose document).
   */
  async findUserByPhone(phone: string): Promise<UserData | null> {
    const user = await this.userRepo.findByPhone(phone);
    if (!user) return null;

    return {
      id: user.id,
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
