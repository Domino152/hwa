import { Router, type Request, type Response } from 'express';
import { sendSuccess } from '../../shared/utils/response.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { module: 'attendance', status: 'placeholder', version: '1.0.0' });
});

export default router;
