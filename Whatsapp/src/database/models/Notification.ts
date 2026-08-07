import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type NotificationType =
  | 'attendance_alert'
  | 'fee_reminder'
  | 'exam_reminder'
  | 'holiday_notice'
  | 'timetable_update'
  | 'general_announcement';

export type NotificationStatus = 'pending' | 'queued' | 'sent' | 'failed' | 'cancelled';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface INotification extends Document {
  type: NotificationType;
  recipient: {
    userId: Types.ObjectId;
    studentId: string;
    role: 'student' | 'parent';
    phone: string | null;
  };
  message: {
    title: string;
    body: string;
    subject?: string;
  };
  status: NotificationStatus;
  priority: NotificationPriority;
  sentAt: Date | null;
  failedAt: Date | null;
  failReason: string | null;
  retryCount: number;
  scheduledFor: Date | null;
  reference: {
    type: 'attendance' | 'fee' | 'exam' | 'schedule' | 'holiday' | null;
    id: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
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
      ],
      required: true,
      index: true,
    },
    recipient: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      studentId: { type: String, required: true },
      role: { type: String, enum: ['student', 'parent'], required: true },
      phone: { type: String, default: null },
    },
    message: {
      title: { type: String, required: true, trim: true },
      body: { type: String, required: true, trim: true },
      subject: { type: String, required: false, trim: true },
    },
    status: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'failed', 'cancelled'],
      required: true,
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      required: true,
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
        enum: ['attendance', 'fee', 'exam', 'schedule', 'holiday', null],
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

export const Notification = mongoose.model<INotification>(
  'Notification',
  notificationSchema,
);
