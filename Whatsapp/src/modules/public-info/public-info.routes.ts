import { Router } from 'express';
import { PublicInfoController } from './public-info.controller.js';
import { publicInformationService } from '../../integration/index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { createPublicContentSchema, updatePublicContentSchema } from './public-info.schemas.js';

const controller = new PublicInfoController(publicInformationService);
const router = Router();

router.get(
  '/',
  asyncHandler(controller.getAll),
);

router.get(
  '/counts',
  asyncHandler(controller.getCategoryCounts),
);

router.get(
  '/search',
  asyncHandler(controller.search),
);

router.get(
  '/category/:category',
  asyncHandler(controller.getByCategory),
);

router.get(
  '/:id',
  asyncHandler(controller.getById),
);

router.post(
  '/',
  authenticate,
  validate(createPublicContentSchema),
  asyncHandler(controller.create),
);

router.put(
  '/:id',
  authenticate,
  validate(updatePublicContentSchema),
  asyncHandler(controller.update),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(controller.delete),
);

export default router;
