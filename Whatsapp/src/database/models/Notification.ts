import mongoose, { Schema, type Document, type Types, type Model } from 'mongoose';

export type NotificationType =
  | 'attendance_alert'
  | 'fee_reminder'
  | 'exam_reminder'
  | 'holiday_notice'
  | 'timetable_update'
  | 'general_announcement'
  | 'ai_response';

export type NotificationStatus = 'pending' | 'queued' | 'sent' | 'failed' | 'cancelled';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationReferenceType =
  | 'attendance'
  | 'fee'
  | 'exam'
  | 'schedule'
  | 'holiday'
  | 'announcement'
  | 'knowledgebase'
  | null;

export interface INotification extends Document {
  type: NotificationType;
  recipient: {
    userId: Types.ObjectId | null;
    studentId: string | null;
    role: 'student' | 'parent' | null;
    phone: string | null;
  };
  message: {
    title: string;
    body: string;
    subject: string | null;
  };
  status: NotificationStatus;
  priority: NotificationPriority;
  sentAt: Date | null;
  failedAt: Date | null;
  failReason: string | null;
  retryCount: number;
  scheduledFor: Date | null;
  reference: {
    type: NotificationReferenceType;
    id: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationModel extends Model<INotification> {
  findPending(limit?: number): Promise<INotification[]>;
  findByRecipient(studentId: string, limit?: number): Promise<INotification[]>;
  markAsSent(notificationId: string): Promise<INotification>;
  markAsFailed(notificationId: string, reason: string): Promise<INotification>;
  incrementRetry(notificationId: string): Promise<INotification>;
}

const notificationSchema = new Schema<INotification, INotificationModel>(
  {
    type: {
      type: String,
      enum: [
        'attendance_alert',
        'fee_reminder',
        'exam_reminder',
        'holiday_notice',
        'timetable_update',
        'general_announcement',
        'ai_response',
      ],
      required: [true, 'Notification type is required'],
      index: true,
    },
    recipient: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      studentId: { type: String, default: null },
      role: { type: String, enum: ['student', 'parent', null], default: null },
      phone: { type: String, default: null },
    },
    message: {
      title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: [200, 'Title cannot exceed 200 characters'] },
      body: { type: String, required: [true, 'Body is required'], trim: true, maxlength: [5000, 'Body cannot exceed 5000 characters'] },
      subject: { type: String, default: null, trim: true },
    },
    status: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'failed', 'cancelled'],
      required: [true, 'Status is required'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      required: [true, 'Priority is required'],
      default: 'normal',
      index: true,
    },
    sentAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failReason: { type: String, default: null },
    retryCount: { type: Number, required: true, default: 0, min: 0 },
    scheduledFor: { type: Date, default: null },
    reference: {
      type: {
        type: String,
        enum: ['attendance', 'fee', 'exam', 'schedule', 'holiday', 'announcement', 'knowledgebase', null],
        default: null,
      },
      id: { type: String, default: null },
    },
  },
  { timestamps: true },
);

notificationSchema.index({ status: 1, priority: 1, scheduledFor: 1 });
notificationSchema.index({ 'recipient.userId': 1, status: 1 });
notificationSchema.index({ 'recipient.studentId': 1, type: 1 });
notificationSchema.index({ 'recipient.studentId': 1, status: 1 });
notificationSchema.index({ createdAt: -1 });

notificationSchema.statics.findPending = function (limit: number = 100) {
  return this.find({
    status: { $in: ['pending', 'queued'] },
    $or: [{ scheduledFor: null }, { scheduledFor: { $lte: new Date() } }],
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .exec();
};

notificationSchema.statics.findByRecipient = function (studentId: string, limit: number = 50) {
  return this.find({ 'recipient.studentId': studentId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

notificationSchema.statics.markAsSent = async function (notificationId: string) {
  return this.findByIdAndUpdate(
    notificationId,
    { status: 'sent', sentAt: new Date() },
    { new: true },
  ).exec();
};

notificationSchema.statics.markAsFailed = async function (notificationId: string, reason: string) {
  return this.findByIdAndUpdate(
    notificationId,
    { status: 'failed', failedAt: new Date(), failReason: reason },
    { new: true },
  ).exec();
};

notificationSchema.statics.incrementRetry = async function (notificationId: string) {
  return this.findByIdAndUpdate(
    notificationId,
    { $inc: { retryCount: 1 } },
    { new: true },
  ).exec();
};

export const Notification =
  mongoose.model<INotification, INotificationModel>('Notification', notificationSchema);
