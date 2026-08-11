import { AttendanceService } from './attendance.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { MongoAttendanceRepository } from '../../repositories/mongodb/attendance.repository.js';

const notificationService = new NotificationService();
const attendanceRepo = new MongoAttendanceRepository();

export const attendanceService = new AttendanceService(attendanceRepo, notificationService);

export { AttendanceService } from './attendance.service.js';
export { AttendanceController } from './attendance.controller.js';
