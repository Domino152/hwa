import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../../src/modules/notifications/notification.service.js';
import { NotificationQueue } from '../../src/modules/notifications/notification-queue.js';

vi.mock('../../src/database/models/Notification.js', () => {
  return {
    Notification: {
      create: vi.fn(),
      find: vi.fn().mockReturnThis(),
      findById: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue([]),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    },
  };
});

vi.mock('../../src/database/models/User.js', () => {
  return {
    User: {
      findOne: vi.fn(),
      find: vi.fn(),
    },
  };
});

import { Notification } from '../../src/database/models/Notification.js';
import { User } from '../../src/database/models/User.js';

const mockNotificationData = {
  _id: 'notif123',
  type: 'attendance_alert',
  recipient: {
    userId: 'user123',
    studentId: '22CSE001',
    role: 'student',
    phone: '917530063885',
  },
  message: { title: 'Low Attendance Alert', body: 'Your attendance is low' },
  status: 'pending',
  priority: 'high',
  scheduledFor: null,
  retryCount: 0,
  sentAt: null,
  failedAt: null,
  failReason: null,
  reference: { type: null, id: null },
  createdAt: new Date(),
  updatedAt: new Date(),
  save: vi.fn(),
};

const mockStudent = {
  _id: 'user123',
  fullName: 'Arjun Sharma',
  studentId: '22CSE001',
  role: 'student',
  whatsappNumber: '917530063885',
  department: 'CSE',
  year: 4,
  section: 'A',
};

const mockParent = {
  _id: 'parent123',
  fullName: 'Suresh Sharma',
  studentId: '22CSE001',
  role: 'parent',
  whatsappNumber: '919876543210',
};

describe('NotificationQueue', () => {
  let queue: NotificationQueue;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new NotificationQueue();
  });

  it('enqueues notification and sorts by priority', () => {
    const normal = { _id: 'n1', priority: 'normal', status: 'pending', scheduledFor: null } as any;
    const urgent = { _id: 'n2', priority: 'urgent', status: 'pending', scheduledFor: null } as any;
    const low = { _id: 'n3', priority: 'low', status: 'pending', scheduledFor: null } as any;

    queue.enqueue(low);
    queue.enqueue(urgent);
    queue.enqueue(normal);

    expect(queue.getQueueLength()).toBe(3);
    const first = queue.dequeue();
    expect(first?._id).toBe('n2');
  });

  it('dequeues in priority order (urgent before normal)', () => {
    const normal = { _id: 'n1', priority: 'normal', status: 'pending', scheduledFor: null } as any;
    const urgent = { _id: 'n2', priority: 'urgent', status: 'pending', scheduledFor: null } as any;

    queue.enqueue(normal);
    queue.enqueue(urgent);

    expect(queue.dequeue()?._id).toBe('n2');
    expect(queue.dequeue()?._id).toBe('n1');
  });

  it('skips scheduled notifications until scheduledFor', () => {
    const future = {
      _id: 'n1',
      priority: 'normal',
      status: 'pending',
      scheduledFor: new Date('2099-01-01'),
    } as any;
    const immediate = {
      _id: 'n2',
      priority: 'normal',
      status: 'pending',
      scheduledFor: null,
    } as any;

    queue.enqueue(future);
    queue.enqueue(immediate);

    const dequeued = queue.dequeue();
    expect(dequeued?._id).toBe('n2');
  });

  it('returns null when queue is empty', () => {
    expect(queue.dequeue()).toBeNull();
  });

  it('processes notification and calls WhatsApp service', async () => {
    const mockSend = vi.fn().mockResolvedValue({ messageId: 'msg123' });
    queue.setWhatsAppService({ sendMessage: mockSend });

    const notification = {
      _id: 'notif123',
      priority: 'normal',
      status: 'pending',
      scheduledFor: null,
      recipient: { phone: '917530063885' },
      message: { body: 'Test message' },
      retryCount: 0,
      save: vi.fn(),
    } as any;

    queue.enqueue(notification);
    const result = await queue.processNext();

    expect(result).toBe(true);
    expect(mockSend).toHaveBeenCalledWith('917530063885@s.whatsapp.net', 'Test message', 'notif-notif123');
    expect(notification.status).toBe('sent');
    expect(notification.sentAt).toBeInstanceOf(Date);
  });

  it('marks notification as failed after max retries', async () => {
    const mockSend = vi.fn().mockRejectedValue(new Error('Send failed'));
    queue.setWhatsAppService({ sendMessage: mockSend });

    const notification = {
      _id: 'notif123',
      priority: 'normal',
      status: 'pending',
      scheduledFor: null,
      recipient: { phone: '917530063885' },
      message: { body: 'Test' },
      retryCount: 2,
      save: vi.fn(),
    } as any;

    queue.enqueue(notification);
    await queue.processNext();

    expect(notification.status).toBe('failed');
    expect(notification.failReason).toBe('Send failed');
  });

  it('skips when no WhatsApp service attached', async () => {
    const notification = {
      _id: 'notif123',
      priority: 'normal',
      status: 'pending',
      scheduledFor: null,
      recipient: { phone: '917530063885' },
      message: { body: 'Test' },
      retryCount: 0,
      save: vi.fn(),
    } as any;

    queue.enqueue(notification);
    const result = await queue.processNext();

    expect(result).toBe(false);
    expect(notification.status).toBe('failed');
    expect(notification.failReason).toBe('WhatsApp service not available');
  });

  it('skips when no phone number', async () => {
    const mockSend = vi.fn();
    queue.setWhatsAppService({ sendMessage: mockSend });

    const notification = {
      _id: 'notif123',
      priority: 'normal',
      status: 'pending',
      scheduledFor: null,
      recipient: { phone: null },
      message: { body: 'Test' },
      retryCount: 0,
      save: vi.fn(),
    } as any;

    queue.enqueue(notification);
    const result = await queue.processNext();

    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
    expect(notification.status).toBe('failed');
  });

  it('returns correct queue status', () => {
    queue.enqueue({ _id: 'n1', priority: 'normal', status: 'pending', scheduledFor: null } as any);
    queue.enqueue({ _id: 'n2', priority: 'high', status: 'pending', scheduledFor: null } as any);

    const status = queue.getQueueStatus();
    expect(status.pending).toBe(2);
    expect(status.processing).toBe(false);
  });
});

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
    vi.mocked(Notification.create).mockReset();
    vi.mocked(User.findOne).mockReset();
    vi.mocked(User.find).mockReset();
  });

  it('creates notification with correct fields', async () => {
    vi.mocked(Notification.create).mockResolvedValue(mockNotificationData as any);

    const result = await service.createNotification({
      type: 'attendance_alert',
      recipientUserId: 'user123',
      recipientStudentId: '22CSE001',
      recipientRole: 'student',
      recipientPhone: '917530063885',
      title: 'Low Attendance',
      body: 'Your attendance is low',
      priority: 'high',
    });

    expect(Notification.create).toHaveBeenCalled();
    expect(result.type).toBe('attendance_alert');
  });

  it('creates attendance alert for student when below 75%', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockStudent as any)
      .mockResolvedValueOnce(null);
    vi.mocked(Notification.create).mockResolvedValue(mockNotificationData as any);

    const notifications = await service.checkAttendanceAlert('22CSE001', 72);

    expect(notifications).toHaveLength(1);
    expect(User.findOne).toHaveBeenCalledWith({
      studentId: '22CSE001',
      role: 'student',
      isActive: true,
    });
  });

  it('creates attendance alert for parent when student below 75%', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockStudent as any)
      .mockResolvedValueOnce(mockParent as any);
    vi.mocked(Notification.create).mockResolvedValue(mockNotificationData as any);

    const notifications = await service.checkAttendanceAlert('22CSE001', 72);

    expect(notifications).toHaveLength(2);
    expect(User.findOne).toHaveBeenCalledWith({
      role: 'parent',
      studentId: '22CSE001',
      isActive: true,
    });
  });

  it('does NOT create attendance alert when >= 75%', async () => {
    const notifications = await service.checkAttendanceAlert('22CSE001', 85);

    expect(notifications).toHaveLength(0);
    expect(Notification.create).not.toHaveBeenCalled();
  });

  it('creates fee reminder with scheduledFor before dueDate', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockStudent as any);
    vi.mocked(Notification.create).mockResolvedValue(mockNotificationData as any);

    const dueDate = new Date('2026-08-15');
    await service.createFeeReminder({
      studentId: '22CSE001',
      amount: 15000,
      dueDate,
      feeType: 'Tuition Fee',
    });

    expect(Notification.create).toHaveBeenCalled();
    const callArgs = vi.mocked(Notification.create).mock.calls[0][0] as any;
    expect(callArgs.type).toBe('fee_reminder');
    expect(callArgs.scheduledFor).toBeInstanceOf(Date);
  });

  it('enqueues notification when enqueue option is true', async () => {
    vi.mocked(Notification.create).mockResolvedValue({
      ...mockNotificationData,
      save: vi.fn(),
    } as any);

    await service.createNotification({
      type: 'holiday_notice',
      recipientUserId: 'user123',
      recipientStudentId: '22CSE001',
      recipientRole: 'student',
      recipientPhone: '917530063885',
      title: 'Holiday',
      body: 'College closed',
      enqueue: true,
    });

    expect(service.queue.getQueueLength()).toBe(1);
  });

  it('marks notification as sent', async () => {
    vi.mocked(Notification.findByIdAndUpdate).mockResolvedValue({
      ...mockNotificationData,
      status: 'sent',
    } as any);

    const result = await service.markAsSent('notif123');
    expect(result?.status).toBe('sent');
    expect(Notification.findByIdAndUpdate).toHaveBeenCalledWith(
      'notif123',
      { status: 'sent', sentAt: expect.any(Date) },
      { new: true },
    );
  });

  it('marks notification as failed with reason', async () => {
    vi.mocked(Notification.findByIdAndUpdate).mockResolvedValue({
      ...mockNotificationData,
      status: 'failed',
    } as any);

    const result = await service.markAsFailed('notif123', 'Network error');
    expect(result?.status).toBe('failed');
    expect(Notification.findByIdAndUpdate).toHaveBeenCalledWith(
      'notif123',
      { status: 'failed', failedAt: expect.any(Date), failReason: 'Network error' },
      { new: true },
    );
  });

  it('creates timetable update for all students in section', async () => {
    vi.mocked(User.find).mockResolvedValue([mockStudent] as any);
    vi.mocked(Notification.create).mockResolvedValue(mockNotificationData as any);

    const notifications = await service.createTimetableUpdate({
      department: 'CSE',
      year: 4,
      section: 'A',
      dayOfWeek: 'Monday',
      changes: 'DBMS moved to Room 401',
    });

    expect(notifications).toHaveLength(1);
    expect(User.find).toHaveBeenCalledWith({
      role: 'student',
      department: 'CSE',
      year: 4,
      section: 'A',
      isActive: true,
    });
  });

  it('creates general announcement for all students when no target', async () => {
    vi.mocked(User.find).mockResolvedValue([mockStudent] as any);
    vi.mocked(Notification.create).mockResolvedValue(mockNotificationData as any);

    const notifications = await service.createGeneralAnnouncement({
      title: 'College Event',
      body: 'Annual day celebration on Friday',
    });

    expect(notifications).toHaveLength(1);
  });

  it('creates exam reminder with scheduledFor one day before exam', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockStudent as any);
    vi.mocked(Notification.create).mockResolvedValue(mockNotificationData as any);

    const examDate = new Date('2026-09-15');
    await service.createExamReminder({
      studentId: '22CSE001',
      subject: 'DBMS',
      examDate,
      examType: 'final',
    });

    expect(Notification.create).toHaveBeenCalled();
    const callArgs = vi.mocked(Notification.create).mock.calls[0][0] as any;
    expect(callArgs.type).toBe('exam_reminder');
    expect(callArgs.scheduledFor).toBeInstanceOf(Date);
  });
});
