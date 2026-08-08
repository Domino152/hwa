import { MongoFeeStructureRepository } from '../../repositories/mongodb/fee-structure.repository.js';
import { MongoUserRepository } from '../../repositories/mongodb/user.repository.js';
import { NotificationService } from '../notifications/notification.service.js';
import { FeeService } from './fee.service.js';

const feeStructureRepo = new MongoFeeStructureRepository();
const userRepo = new MongoUserRepository();
const notificationService = new NotificationService();

export const feeService = new FeeService(
  undefined,
  feeStructureRepo,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  userRepo,
  notificationService,
);

export { FeeService } from './fee.service.js';
export { FeeController } from './fee.controller.js';
export { computeInstallmentStatus } from './fee.service.js';
