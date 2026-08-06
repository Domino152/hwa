import { Notification, type INotification, type NotificationType, type NotificationPriority, type NotificationStatus } from '../../database/models/Notification.js';
import { User } from '../../database/models/User.js';
import { NotificationQueue } from './notification-queue.js';
import logger from '../../shared/utils/logger.js';

const serviceLogger = logger.child({ module: 'notification-service' });

const ATTENDANCE_THRESHOLD = 75;

const PRIORITY_MAP: Record<NotificationType, NotificationPriority> = {
  attendance_alert: 'high',
  fee_reminder: 'normal',
  exam_reminder: 'high',
  holiday_notice: 'normal',
  timetable_update: 'normal',
  general_announcement: 'normal',
};

export interface CreateNotificationInput {
  type: NotificationType;
  recipientUserId: string;
  recipientStudentId: string;
  recipientRole: 'student' | 'parent';
  recipientPhone: string | null;
  title: string;
  body: string;
  subject?: string;
  priority?: NotificationPriority;
  scheduledFor?: Date;
  reference?: { type: string | null; id: string | null };
  enqueue?: boolean;
}

export interface NotificationFilter {
  studentId?: string;
  userId?: string;
  type?: NotificationType;
  status?: NotificationStatus;
  page?: number;
  limit?: number;
}

export interface NotificationStats {
  total: number;
  byStatus: Record<NotificationStatus, number>;
  byType: Record<NotificationType, number>;
}

export class NotificationService {
  readonly queue = new NotificationQueue();

  async createNotification(input: CreateNotificationInput): Promise<INotification> {
    const notification = await Notification.create({
      type: input.type,
      recipient: {
        userId: input.recipientUserId,
        studentId: input.recipientStudentId,
        role: input.recipientRole,
        phone: input.recipientPhone,
      },
      message: {
        title: input.title,
        body: input.body,
        subject: input.subject,
      },
      status: input.enqueue ? 'queued' : 'pending',
      priority: input.priority ?? PRIORITY_MAP[input.type],
      scheduledFor: input.scheduledFor ?? null,
      reference: input.reference ?? { type: null, id: null },
    });

    if (input.enqueue) {
      this.queue.enqueue(notification);
    }

    serviceLogger.info(
      { notificationId: String(notification._id), type: input.type, recipientRole: input.recipientRole },
      'Notification created',
    );

    return notification;
  }

  async checkAttendanceAlert(studentId: string, percentage: number): Promise<INotification[]> {
    if (percentage >= ATTENDANCE_THRESHOLD) return [];

    const student = await User.findOne({ studentId, role: 'student', isActive: true });
    if (!student) return [];

    const notifications: INotification[] = [];

    const studentNotif = await this.createNotification({
      type: 'attendance_alert',
      recipientUserId: String(student._id),
      recipientStudentId: studentId,
      recipientRole: 'student',
      recipientPhone: student.whatsappNumber,
      title: 'Low Attendance Alert',
      body:
        `Your attendance has dropped to ${percentage}%.\n\n` +
        `Minimum required: ${ATTENDANCE_THRESHOLD}%\n\n` +
        `Please attend classes regularly to avoid academic penalties.`,
      subject: undefined,
      priority: 'high',
      enqueue: true,
    });
    notifications.push(studentNotif);

    const parent = await User.findOne({ role: 'parent', studentId, isActive: true });
    if (parent) {
      const parentNotif = await this.createNotification({
        type: 'attendance_alert',
        recipientUserId: String(parent._id),
        recipientStudentId: studentId,
        recipientRole: 'parent',
        recipientPhone: parent.whatsappNumber,
        title: 'Child Attendance Alert',
        body:
          `${student.fullName}'s attendance has dropped to ${percentage}%.\n\n` +
          `Minimum required: ${ATTENDANCE_THRESHOLD}%\n\n` +
          `Please ensure regular class attendance.`,
        subject: undefined,
        priority: 'high',
        enqueue: true,
      });
      notifications.push(parentNotif);
    }

    return notifications;
  }

  async createFeeReminder(input: {
    studentId: string;
    amount: number;
    dueDate: Date;
    feeType: string;
  }): Promise<INotification | null> {
    const student = await User.findOne({ studentId: input.studentId, role: 'student', isActive: true });
    if (!student || !student.whatsappNumber) return null;

    const daysUntilDue = Math.ceil((input.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const dueDateStr = input.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const scheduledFor = new Date(input.dueDate);
    scheduledFor.setDate(scheduledFor.getDate() - 1);
    scheduledFor.setHours(9, 0, 0, 0);

    return this.createNotification({
      type: 'fee_reminder',
      recipientUserId: String(student._id),
      recipientStudentId: input.studentId,
      recipientRole: 'student',
      recipientPhone: student.whatsappNumber,
      title: `Fee Reminder — ${input.feeType}`,
      body:
        `Fee Reminder\n\n` +
        `Type: ${input.feeType}\n` +
        `Amount: ₹${input.amount.toLocaleString('en-IN')}\n` +
        `Due Date: ${dueDateStr}\n` +
        (daysUntilDue <= 7
          ? `\n⚠️ Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}. Please pay soon.`
          : `\nPlease pay before the due date.`),
      subject: input.feeType,
      priority: daysUntilDue <= 3 ? 'urgent' : 'normal',
      scheduledFor,
      reference: { type: 'fee', id: input.studentId },
      enqueue: true,
    });
  }

  async createExamReminder(input: {
    studentId: string;
    subject: string;
    examDate: Date;
    examType: string;
  }): Promise<INotification | null> {
    const student = await User.findOne({ studentId: input.studentId, role: 'student', isActive: true });
    if (!student || !student.whatsappNumber) return null;

    const examDateStr = input.examDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const scheduledFor = new Date(input.examDate);
    scheduledFor.setDate(scheduledFor.getDate() - 1);
    scheduledFor.setHours(18, 0, 0, 0);

    return this.createNotification({
      type: 'exam_reminder',
      recipientUserId: String(student._id),
      recipientStudentId: input.studentId,
      recipientRole: 'student',
      recipientPhone: student.whatsappNumber,
      title: `Exam Tomorrow — ${input.subject}`,
      body:
        `Exam Reminder\n\n` +
        `Subject: ${input.subject}\n` +
        `Type: ${input.examType}\n` +
        `Date: ${examDateStr}\n\n` +
        `Good luck! Please prepare well.`,
      subject: input.subject,
      priority: 'high',
      scheduledFor,
      reference: { type: 'exam', id: input.studentId },
      enqueue: true,
    });
  }

  async createTimetableUpdate(input: {
    department: string;
    year: number;
    section: string;
    dayOfWeek: string;
    changes: string;
  }): Promise<INotification[]> {
    const students = await User.find({
      role: 'student',
      department: input.department,
      year: input.year,
      section: input.section,
      isActive: true,
    });

    const notifications: INotification[] = [];

    for (const student of students) {
      if (!student.whatsappNumber) continue;

      const notif = await this.createNotification({
        type: 'timetable_update',
        recipientUserId: String(student._id),
        recipientStudentId: student.studentId,
        recipientRole: 'student',
        recipientPhone: student.whatsappNumber,
        title: `Schedule Change — ${input.dayOfWeek}`,
        body:
          `Timetable Update\n\n` +
          `Day: ${input.dayOfWeek}\n` +
          `Department: ${input.department}\n` +
          `Year: ${input.year}, Section: ${input.section}\n\n` +
          `${input.changes}`,
        priority: 'normal',
        reference: { type: 'schedule', id: input.department },
        enqueue: true,
      });
      notifications.push(notif);
    }

    return notifications;
  }

  async createHolidayNotice(input: {
    title: string;
    date: string;
    reason: string;
    affectedDepartments?: string[];
  }): Promise<INotification[]> {
    const filter: Record<string, unknown> = { role: 'student', isActive: true };
    if (input.affectedDepartments?.length) {
      filter.department = { $in: input.affectedDepartments };
    }

    const students = await User.find(filter).select('-passwordHash');
    const notifications: INotification[] = [];

    for (const student of students) {
      if (!student.whatsappNumber) continue;

      const notif = await this.createNotification({
        type: 'holiday_notice',
        recipientUserId: String(student._id),
        recipientStudentId: student.studentId,
        recipientRole: 'student',
        recipientPhone: student.whatsappNumber,
        title: input.title,
        body:
          `Holiday Notice\n\n` +
          `Date: ${input.date}\n` +
          `Reason: ${input.reason}\n\n` +
          `Enjoy your holiday!`,
        priority: 'low',
        reference: { type: 'holiday', id: null },
        enqueue: true,
      });
      notifications.push(notif);
    }

    return notifications;
  }

  async createGeneralAnnouncement(input: {
    title: string;
    body: string;
    targetStudentIds?: string[];
    priority?: NotificationPriority;
  }): Promise<INotification[]> {
    let students;

    if (input.targetStudentIds?.length) {
      students = await User.find({ studentId: { $in: input.targetStudentIds }, role: 'student', isActive: true });
    } else {
      students = await User.find({ role: 'student', isActive: true });
    }

    const notifications: INotification[] = [];

    for (const student of students) {
      if (!student.whatsappNumber) continue;

      const notif = await this.createNotification({
        type: 'general_announcement',
        recipientUserId: String(student._id),
        recipientStudentId: student.studentId,
        recipientRole: 'student',
        recipientPhone: student.whatsappNumber,
        title: input.title,
        body: input.body,
        priority: input.priority ?? 'normal',
        reference: { type: null, id: null },
        enqueue: true,
      });
      notifications.push(notif);
    }

    return notifications;
  }

  async getNotifications(filter: NotificationFilter): Promise<{ notifications: INotification[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filter.studentId) query['recipient.studentId'] = filter.studentId;
    if (filter.userId) query['recipient.userId'] = filter.userId;
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query),
    ]);

    return { notifications, total };
  }

  async getNotificationById(id: string): Promise<INotification | null> {
    return Notification.findById(id);
  }

  async getNotificationStats(): Promise<NotificationStats> {
    const [total, byStatus, byType] = await Promise.all([
      Notification.countDocuments(),
      Notification.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Notification.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s) => { statusMap[s._id] = s.count; });

    const typeMap: Record<string, number> = {};
    byType.forEach((t) => { typeMap[t._id] = t.count; });

    return {
      total,
      byStatus: {
        pending: statusMap['pending'] ?? 0,
        queued: statusMap['queued'] ?? 0,
        sent: statusMap['sent'] ?? 0,
        failed: statusMap['failed'] ?? 0,
        cancelled: statusMap['cancelled'] ?? 0,
      },
      byType: {
        attendance_alert: typeMap['attendance_alert'] ?? 0,
        fee_reminder: typeMap['fee_reminder'] ?? 0,
        exam_reminder: typeMap['exam_reminder'] ?? 0,
        holiday_notice: typeMap['holiday_notice'] ?? 0,
        timetable_update: typeMap['timetable_update'] ?? 0,
        general_announcement: typeMap['general_announcement'] ?? 0,
      },
    };
  }

  async markAsSent(id: string): Promise<INotification | null> {
    return Notification.findByIdAndUpdate(
      id,
      { status: 'sent', sentAt: new Date() },
      { new: true },
    );
  }

  async markAsFailed(id: string, reason: string): Promise<INotification | null> {
    return Notification.findByIdAndUpdate(
      id,
      { status: 'failed', failedAt: new Date(), failReason: reason },
      { new: true },
    );
  }

  async cancelNotification(id: string): Promise<INotification | null> {
    return Notification.findByIdAndUpdate(
      id,
      { status: 'cancelled' },
      { new: true },
    );
  }

  async getPendingNotifications(scheduledBefore?: Date): Promise<INotification[]> {
    const query: Record<string, unknown> = {
      status: { $in: ['pending', 'queued'] },
    };
    if (scheduledBefore) {
      query.$or = [
        { scheduledFor: null },
        { scheduledFor: { $lte: scheduledBefore } },
      ];
    }
    return Notification.find(query).sort({ priority: 1, scheduledFor: 1 });
  }
}
