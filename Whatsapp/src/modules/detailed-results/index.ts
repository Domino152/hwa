import { MongoSubjectRepository } from '../../repositories/mongodb/subject.repository.js';
import { DetailedResultService } from './detailed-result.service.js';

const subjectRepo = new MongoSubjectRepository();
export const detailedResultService = new DetailedResultService(undefined, subjectRepo);

export { DetailedResultService } from './detailed-result.service.js';
export { DetailedResultController } from './detailed-result.controller.js';
export { computeGradeFromPercentage, computeTotals, GRADE_SCALE } from './detailed-result.service.js';
