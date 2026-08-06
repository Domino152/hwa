import { MongoAttendanceRepository } from '../repositories/mongodb/attendance.repository.js';
import { MongoFeeRepository } from '../repositories/mongodb/fee.repository.js';
import { MongoScheduleRepository } from '../repositories/mongodb/schedule.repository.js';
import { MongoResultRepository } from '../repositories/mongodb/result.repository.js';
import { MongoUserRepository } from '../repositories/mongodb/user.repository.js';
import { MongoPublicContentRepository } from '../repositories/mongodb/public-content.repository.js';

import { AttendanceIntegrationService } from './services/attendance.service.js';
import { FeeIntegrationService } from './services/fee.service.js';
import { ScheduleIntegrationService } from './services/schedule.service.js';
import { ResultIntegrationService } from './services/result.service.js';
import { PublicInformationService } from './services/public-information.service.js';
import { ProfileService } from './services/profile.service.js';
import { IntegrationService } from './integration.service.js';

/**
 * Composition Root
 *
 * This is the ONLY file that references concrete MongoDB implementations.
 * To switch data sources (e.g. SAP, Oracle), create new repository
 * implementations and change only this file.
 */

// ── Repositories (data access) ──────────────────────────────────────
const attendanceRepo = new MongoAttendanceRepository();
const feeRepo = new MongoFeeRepository();
const scheduleRepo = new MongoScheduleRepository();
const resultRepo = new MongoResultRepository();
const userRepo = new MongoUserRepository();
const publicContentRepo = new MongoPublicContentRepository();

// ── Services (business logic) ───────────────────────────────────────
const attendanceService = new AttendanceIntegrationService(attendanceRepo);
const feeService = new FeeIntegrationService(feeRepo);
const scheduleService = new ScheduleIntegrationService(scheduleRepo);
const resultService = new ResultIntegrationService(resultRepo);
const publicInformationService = new PublicInformationService(publicContentRepo);
const profileService = new ProfileService(userRepo, attendanceService, feeService, scheduleService, resultService);

// ── Integration facade (public API) ─────────────────────────────────
export const integration = new IntegrationService(
  attendanceService,
  feeService,
  scheduleService,
  resultService,
  publicInformationService,
  profileService,
  userRepo,
);

export { IntegrationService } from './integration.service.js';
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
