import type { Response } from 'express';
import { MongoUserRepository } from '../../repositories/mongodb/user.repository.js';
import { sendSuccess } from '../../shared/utils/response.js';
import type { AuthenticatedRequest } from '../auth/auth.middleware.js';

export class ParentController {
  private readonly userRepo = new MongoUserRepository();

  getLinkedStudents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) return;
    const students = await this.userRepo.findLinkedStudents(req.user.userId);
    sendSuccess(res, { students, total: students.length });
  };

  getStudentProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) return;
    const studentId = String(req.params.studentId);

    const parent = await this.userRepo.findById(req.user.userId);
    if (!parent || parent.role !== 'parent') {
      sendSuccess(res, { error: 'Not authorized as parent' }, 403);
      return;
    }

    if (parent.studentId !== studentId) {
      sendSuccess(res, { error: 'Not linked to this student' }, 403);
      return;
    }

    const student = await this.userRepo.findByStudentId(studentId);
    if (!student) {
      sendSuccess(res, { error: 'Student not found' }, 404);
      return;
    }

    sendSuccess(res, { student, parent: { id: parent.id, fullName: parent.fullName } });
  };
}
