import { MongoFeeRepository } from '../../repositories/mongodb/fee.repository.js';
import { FeeService } from './fee.service.js';

const feeRepo = new MongoFeeRepository();
export const feeService = new FeeService(feeRepo);

export { FeeService } from './fee.service.js';
export { FeeController } from './fee.controller.js';
