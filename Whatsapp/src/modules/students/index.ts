import { MongoStudentRepository } from '../../repositories/mongodb/student.repository.js';
import { StudentService } from './student.service.js';

const studentRepo = new MongoStudentRepository();
export const studentService = new StudentService(studentRepo);

export { StudentService } from './student.service.js';
export { StudentController } from './student.controller.js';
export type { CreateStudentInput, UpdateStudentInput } from './student.service.js';
