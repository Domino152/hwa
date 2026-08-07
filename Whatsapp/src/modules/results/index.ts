import { MongoResultRepository } from '../../repositories/mongodb/result.repository.js';
import { ResultService } from './result.service.js';

const resultRepo = new MongoResultRepository();
export const resultService = new ResultService(resultRepo);

export { ResultService } from './result.service.js';
export { ResultController } from './result.controller.js';
