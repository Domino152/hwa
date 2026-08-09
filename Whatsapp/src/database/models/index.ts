export { College } from './College.js';
export type { ICollege, ICollegeModel } from './College.js';

export { Department } from './Department.js';
export type { IDepartment, IDepartmentModel } from './Department.js';

export { Program } from './Program.js';
export type { IProgram, IProgramModel } from './Program.js';

export { Batch } from './Batch.js';
export type { IBatch, IBatchModel } from './Batch.js';

export { Section } from './Section.js';
export type { ISection, ISectionModel } from './Section.js';

export { Student } from './Student.js';
export type { IStudent, IStudentModel, StudentStatus, Gender } from './Student.js';

export { User } from './User.js';
export type { IUser, IUserModel, UserRole } from './User.js';

export { DailyAttendance } from './DailyAttendance.js';
export type { IDailyAttendance, IDailyAttendanceModel, AttendanceStatus } from './DailyAttendance.js';

export { Schedule } from './Schedule.js';
export type { ISchedule, IScheduleModel, IHoliday } from './Schedule.js';

export { Subject } from './Subject.js';
export type { ISubject, ISubjectModel, SubjectType } from './Subject.js';

export { Result } from './Result.js';
export type { IResult, IResultModel, IComponentMarks } from './Result.js';

export { Assignment } from './Assignment.js';
export type {
  IAssignment,
  IAssignmentModel,
  ISubmission,
  AssignmentStatus,
  SubmissionStatus,
} from './Assignment.js';

export { FeeStructure } from './FeeStructure.js';
export type { IFeeStructure, IFeeStructureModel, FeeCategory, FeeFrequency } from './FeeStructure.js';

export { FeePayment } from './FeePayment.js';
export type {
  IFeePayment,
  IFeePaymentModel,
  IInstallment,
  IPaymentTransaction,
  IFine,
  IScholarship,
  FeeStatus,
  InstallmentStatus,
  PaymentStatus,
  PaymentMethod,
  FineStatus,
  ScholarshipStatus,
  ScholarshipType,
} from './FeePayment.js';

export { Announcement } from './Announcement.js';
export type {
  IAnnouncement,
  IAnnouncementModel,
  IAnnouncementAttachment,
  AnnouncementAudience,
  AnnouncementPriority,
  AnnouncementCategory,
} from './Announcement.js';

export { KnowledgeBase } from './KnowledgeBase.js';
export type { IKnowledgeBase, IKnowledgeBaseModel, KnowledgeCategory } from './KnowledgeBase.js';

export { Conversation } from './Conversation.js';
export type {
  IConversation,
  IConversationModel,
  IMessage,
  MessageDirection,
  MessageType,
  MessageStatus,
} from './Conversation.js';

export { Notification } from './Notification.js';
export type {
  INotification,
  INotificationModel,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationReferenceType,
} from './Notification.js';

export { LoginToken } from './LoginToken.js';
export type { ILoginToken, ILoginTokenModel } from './LoginToken.js';
