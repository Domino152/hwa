import { MongoSubjectRepository } from '../../repositories/mongodb/subject.repository.js';
import { SubjectService } from './subject.service.js';

const subjectRepo = new MongoSubjectRepository();
export const subjectService = new SubjectService(subjectRepo);

export { SubjectService } from './subject.service.js';
export { SubjectController } from './subject.controller.js';
