import type { Response } from 'express';
import { integration } from '../../integration/index.js';
import { sendSuccess } from '../../shared/utils/response.js';
import type { AuthenticatedRequest } from '../auth/auth.middleware.js';

export class StudentController {
  getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const profile = await integration.getStudentProfile(studentId);
    sendSuccess(res, profile);
  };

  getByPhone = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const phone = String(req.params.phone);
    const user = await integration.findUserByPhone(phone);
    if (!user) {
      sendSuccess(res, { error: 'Student not found' }, 404);
      return;
    }
    sendSuccess(res, user);
  };

  searchStudents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const department = req.query.department as string | undefined;
    const year = req.query.year as string | undefined;
    const section = req.query.section as string | undefined;
    if (!department || !year || !section) {
      sendSuccess(res, { error: 'department, year, and section are required' }, 400);
      return;
    }
    const userRepo = integration['userRepo'];
    const students = await userRepo.findStudentsByClass(department, Number(year), section);
    sendSuccess(res, { students, total: students.length });
  };
}
