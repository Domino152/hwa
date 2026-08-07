import { MongoAttendanceRepository } from '../../repositories/mongodb/attendance.repository.js';
import { AttendanceService } from './attendance.service.js';

const attendanceRepo = new MongoAttendanceRepository();
export const attendanceService = new AttendanceService(attendanceRepo);

export { AttendanceService } from './attendance.service.js';
export { AttendanceController } from './attendance.controller.js';
