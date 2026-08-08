import { AttendanceService } from './attendance.service.js';
import { NotificationService } from '../notifications/notification.service.js';

const notificationService = new NotificationService();

export const attendanceService = new AttendanceService(undefined, notificationService);

export { AttendanceService } from './attendance.service.js';
export { AttendanceController } from './attendance.controller.js';
