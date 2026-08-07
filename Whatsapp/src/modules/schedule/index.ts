import { MongoScheduleRepository } from '../../repositories/mongodb/schedule.repository.js';
import { ScheduleService } from './schedule.service.js';

const scheduleRepo = new MongoScheduleRepository();
export const scheduleService = new ScheduleService(scheduleRepo);

export { ScheduleService } from './schedule.service.js';
export { ScheduleController } from './schedule.controller.js';
