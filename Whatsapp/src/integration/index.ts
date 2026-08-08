import { MongoScheduleRepository } from '../repositories/mongodb/schedule.repository.js';
import { MongoResultRepository } from '../repositories/mongodb/result.repository.js';
import { MongoUserRepository } from '../repositories/mongodb/user.repository.js';
import { MongoStudentRepository } from '../repositories/mongodb/student.repository.js';

import { AttendanceIntegrationService } from './services/attendance.service.js';
import { FeeIntegrationService } from './services/fee.service.js';
import { ScheduleIntegrationService } from './services/schedule.service.js';
import { ResultIntegrationService } from './services/result.service.js';
import { PublicInformationService } from './services/public-information.service.js';
import { ProfileService } from './services/profile.service.js';
import { StudentIntegrationService } from './services/student-integration.service.js';
import { IntegrationService } from './integration.service.js';
import { ScheduleService } from '../modules/schedule/schedule.service.js';
/**
 * Composition Root
 *
 * This is the ONLY file that references concrete MongoDB implementations.
 * To switch data sources (e.g. SAP, Oracle), create new repository
 * implementations and change only this file.
 */

// -- Repositories (data access) --------------------------------------
const scheduleRepo = new MongoScheduleRepository();
const resultRepo = new MongoResultRepository();
const userRepo = new MongoUserRepository();
const studentRepo = new MongoStudentRepository();

// -- Services (business logic) ---------------------------------------
const attendanceService = new AttendanceIntegrationService();
const feeService = new FeeIntegrationService();
const scheduleDomainService = new ScheduleService(scheduleRepo);
const scheduleService = new ScheduleIntegrationService(scheduleDomainService);
const resultService = new ResultIntegrationService(resultRepo);
const publicInformationService = new PublicInformationService();
export { publicInformationService };
const profileService = new ProfileService(userRepo, attendanceService, feeService, scheduleService, resultService);
const studentIntegrationService = new StudentIntegrationService(studentRepo);

// -- Integration facade (public API) ---------------------------------
export const integration = new IntegrationService(
  attendanceService,
  feeService,
  scheduleService,
  resultService,
  publicInformationService,
  profileService,
  userRepo,
  studentIntegrationService,
);

export { IntegrationService } from './integration.service.js';
export { StudentIntegrationService } from './services/student-integration.service.js';
export type {
  AttendanceData,
  AttendanceResult,
  FeeData,
  FeeResult,
  ScheduleEntry,
  ScheduleResult,
  ResultData,
  ResultResult,
  UserData,
  StudentProfileResult,
  PublicContentData,
  PublicInformationResult,
  CategoryCount,
} from './types.js';
