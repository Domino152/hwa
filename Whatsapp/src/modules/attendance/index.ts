import { MongoAttendanceRepository } from '../../repositories/mongodb/attendance.repository.js';
import { AttendanceService } from './attendance.service.js';
import { NotificationService } from '../notifications/notification.service.js';

const attendanceRepo = new MongoAttendanceRepository();
const notificationService = new NotificationService();

export const attendanceService = new AttendanceService(attendanceRepo, notificationService);

export { AttendanceService } from './attendance.service.js';
export { AttendanceController } from './attendance.controller.js';
