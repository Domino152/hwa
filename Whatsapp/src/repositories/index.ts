export type {
  AssignmentRecord,
  AssignmentSubmissionRecord,
  AssignmentStatus,
  ScheduleRecord,
  HolidayOverrideRecord,
  CurrentClassResult,
  NextClassResult,
  ResultRecord,
  UserRecord,
  SubjectRecord,
  AnnouncementRecord,
  AnnouncementAttachment,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAudience,
  StudentRecord,
} from './types.js';

export type { IScheduleRepository } from './schedule.repository.js';
export type { IResultRepository } from './result.repository.js';
export type { IUserRepository } from './user.repository.js';
export type { ISubjectRepository } from './subject.repository.js';
export type { IAnnouncementRepository } from './announcement.repository.js';
export type { IStudentRepository } from './student.repository.js';
export type { IAssignmentRepository, IAssignmentSubmissionRepository } from './assignment.repository.js';
