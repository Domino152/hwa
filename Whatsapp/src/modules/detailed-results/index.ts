import { MongoDetailedResultRepository } from '../../repositories/mongodb/detailed-result.repository.js';
import { MongoSubjectRepository } from '../../repositories/mongodb/subject.repository.js';
import { DetailedResultService } from './detailed-result.service.js';

const detailedResultRepo = new MongoDetailedResultRepository();
const subjectRepo = new MongoSubjectRepository();
export const detailedResultService = new DetailedResultService(detailedResultRepo, subjectRepo);

export { DetailedResultService } from './detailed-result.service.js';
export { DetailedResultController } from './detailed-result.controller.js';
export { computeGradeFromPercentage, computeTotals, GRADE_SCALE } from './detailed-result.service.js';