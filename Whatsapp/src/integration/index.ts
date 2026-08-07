import { MongoAttendanceRepository } from '../repositories/mongodb/attendance.repository.js';
import { MongoFeeRepository } from '../repositories/mongodb/fee.repository.js';
import { MongoScheduleRepository } from '../repositories/mongodb/schedule.repository.js';
import { MongoResultRepository } from '../repositories/mongodb/result.repository.js';
import { MongoUserRepository } from '../repositories/mongodb/user.repository.js';
import { MongoPublicContentRepository } from '../repositories/mongodb/public-content.repository.js';
import { MongoStudentRepository } from '../repositories/mongodb/student.repository.js';

import { AttendanceIntegrationService } from './services/attendance.service.js';
import { FeeIntegrationService } from './services/fee.service.js';
import { ScheduleIntegrationService } from './services/schedule.service.js';
import { ResultIntegrationService } from './services/result.service.js';
import { DetailedResultIntegrationService } from './services/detailed-result.service.js';
import { PublicInformationService } from './services/public-information.service.js';
import { ProfileService } from './services/profile.service.js';
import { StudentIntegrationService } from './services/student-integration.service.js';
import { IntegrationService } from './integration.service.js';
import { ScheduleService } from '../modules/schedule/schedule.service.js';
import { DetailedResultService } from '../modules/detailed-results/detailed-result.service.js';
import { MongoDetailedResultRepository } from '../repositories/mongodb/detailed-result.repository.js';
import { MongoSubjectRepository } from '../repositories/mongodb/subject.repository.js';

/**
 * Composition Root
 *
 * This is the ONLY file that references concrete MongoDB implementations.
 * To switch data sources (e.g. SAP, Oracle), create new repository
 * implementations and change only this file.
 */

// -- Repositories (data access) --------------------------------------
const attendanceRepo = new MongoAttendanceRepository();
const feeRepo = new MongoFeeRepository();
const scheduleRepo = new MongoScheduleRepository();
const resultRepo = new MongoResultRepository();
const userRepo = new MongoUserRepository();
const publicContentRepo = new MongoPublicContentRepository();
const studentRepo = new MongoStudentRepository();
const detailedResultRepo = new MongoDetailedResultRepository();
const subjectRepo = new MongoSubjectRepository();

// -- Services (business logic) ---------------------------------------
const attendanceService = new AttendanceIntegrationService(attendanceRepo);
const feeService = new FeeIntegrationService(feeRepo);
const scheduleDomainService = new ScheduleService(scheduleRepo);
const scheduleService = new ScheduleIntegrationService(scheduleDomainService);
const resultService = new ResultIntegrationService(resultRepo);
const detailedResultDomainService = new DetailedResultService(detailedResultRepo, subjectRepo);
const detailedResultService = new DetailedResultIntegrationService(detailedResultDomainService);
const publicInformationService = new PublicInformationService(publicContentRepo);
export { publicInformationService };
const profileService = new ProfileService(userRepo, attendanceService, feeService, scheduleService, resultService, detailedResultService);
const studentIntegrationService = new StudentIntegrationService(studentRepo);

// -- Integration facade (public API) ---------------------------------
export const integration = new IntegrationService(
  attendanceService,
  feeService,
  scheduleService,
  resultService,
  detailedResultService,
  publicInformationService,
  profileService,
  userRepo,
  studentIntegrationService,
);

export { IntegrationService } from './integration.service.js';
export { StudentIntegrationService } from './services/student-integration.service.js';
export { DetailedResultIntegrationService } from './services/detailed-result.service.js';
export type {
  AttendanceData,
  AttendanceResult,
  FeeData,
  FeeResult,
  ScheduleEntry,
  ScheduleResult,
  ResultData,
  DetailedResultData,
  SemesterGpaData,
  CgpaData,
  ResultResult,
  DetailedResultResult,
  UserData,
  StudentProfileResult,
  PublicContentData,
  PublicInformationResult,
  CategoryCount,
} from './types.js';
