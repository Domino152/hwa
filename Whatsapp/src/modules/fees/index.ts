import { MongoFeeRepository } from '../../repositories/mongodb/fee.repository.js';
import { MongoFeeStructureRepository } from '../../repositories/mongodb/fee-structure.repository.js';
import { MongoInstallmentRepository } from '../../repositories/mongodb/installment.repository.js';
import { MongoPaymentRepository } from '../../repositories/mongodb/payment.repository.js';
import { MongoReceiptRepository } from '../../repositories/mongodb/receipt.repository.js';
import { MongoScholarshipRepository } from '../../repositories/mongodb/scholarship.repository.js';
import { MongoFineRepository } from '../../repositories/mongodb/fine.repository.js';
import { MongoPendingAmountRepository } from '../../repositories/mongodb/pending-amount.repository.js';
import { MongoUserRepository } from '../../repositories/mongodb/user.repository.js';
import { NotificationService } from '../notifications/notification.service.js';
import { FeeService } from './fee.service.js';

const feeRepo = new MongoFeeRepository();
const feeStructureRepo = new MongoFeeStructureRepository();
const installmentRepo = new MongoInstallmentRepository();
const paymentRepo = new MongoPaymentRepository();
const receiptRepo = new MongoReceiptRepository();
const scholarshipRepo = new MongoScholarshipRepository();
const fineRepo = new MongoFineRepository();
const pendingRepo = new MongoPendingAmountRepository();
const userRepo = new MongoUserRepository();
const notificationService = new NotificationService();

export const feeService = new FeeService(
  feeRepo,
  feeStructureRepo,
  installmentRepo,
  paymentRepo,
  receiptRepo,
  scholarshipRepo,
  fineRepo,
  pendingRepo,
  userRepo,
  notificationService,
);

export { FeeService } from './fee.service.js';
export { FeeController } from './fee.controller.js';
export { computeInstallmentStatus } from './fee.service.js';