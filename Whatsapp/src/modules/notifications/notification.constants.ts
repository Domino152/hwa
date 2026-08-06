export const NOTIFICATION_TYPES = [
  'attendance_alert',
  'fee_reminder',
  'exam_reminder',
  'holiday_notice',
  'timetable_update',
  'general_announcement',
] as const;

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export const NOTIFICATION_STATUSES = ['pending', 'queued', 'sent', 'failed', 'cancelled'] as const;

export type NotificationTypeFilter = (typeof NOTIFICATION_TYPES)[number];
export type NotificationPriorityFilter = (typeof NOTIFICATION_PRIORITIES)[number];
export type NotificationStatusFilter = (typeof NOTIFICATION_STATUSES)[number];
