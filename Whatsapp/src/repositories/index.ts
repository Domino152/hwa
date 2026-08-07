export type {
  AttendanceRecord,
  FeeRecord,
  FeeStructureRecord,
  InstallmentRecord,
  PaymentRecord,
  ReceiptRecord,
  ScholarshipRecord,
  FineRecord,
  PendingAmountRecord,
  PaymentHistoryRecord,
  AssignmentRecord,
  AssignmentSubmissionRecord,
  ScheduleRecord,
  HolidayOverrideRecord,
  CurrentClassResult,
  NextClassResult,
  ResultRecord,
  DetailedResultRecord,
  SemesterGpaResult,
  CgpaResult,
  SubjectResultStats,
  UserRecord,
  PublicContentRecord,
  CategoryCountRecord,
  SubjectRecord,
  AnnouncementRecord,
  AnnouncementAttachment,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAudience,
  StudentRecord,
} from './types.js';

export type { IAttendanceRepository } from './attendance.repository.js';
export type {
  IFeeRepository,
  IFeeStructureRepository,
  IInstallmentRepository,
  IPaymentRepository,
  IReceiptRepository,
  IScholarshipRepository,
  IFineRepository,
  IPendingAmountRepository,
} from './fee.repository.js';
export type { IScheduleRepository } from './schedule.repository.js';
export type { IResultRepository } from './result.repository.js';
export type { IDetailedResultRepository } from './detailed-result.repository.js';
export type { IUserRepository } from './user.repository.js';
export type { IPublicContentRepository } from './public-content.repository.js';
export type { ISubjectRepository } from './subject.repository.js';
export type { IAnnouncementRepository } from './announcement.repository.js';
export type { IStudentRepository } from './student.repository.js';
export type { IAssignmentRepository, IAssignmentSubmissionRepository } from './assignment.repository.js';