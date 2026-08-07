import type { Request, Response } from 'express';
import { PublicInformationService } from '../../integration/services/public-information.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { ValidationError, NotFoundError } from '../../shared/utils/errors.js';
import {
  createPublicContentSchema,
  updatePublicContentSchema,
  publicContentQuerySchema,
} from './public-info.schemas.js';

export class PublicInfoController {
  constructor(private readonly service: PublicInformationService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const parsed = publicContentQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('Invalid query parameters', parsed.error.format());

    const { category, isActive, search, page, limit } = parsed.data;

    if (search) {
      const result = await this.service.search(search);
      sendSuccess(res, { entries: result.entries, total: result.entries.length, category: result.category });
      return;
    }

    if (category) {
      const result = await this.service.getByCategory(category);
      sendSuccess(res, { entries: result.entries, total: result.entries.length, category, hasData: result.hasData });
      return;
    }

    let entries = await this.service.getAll(isActive);
    const total = entries.length;
    const offset = (page - 1) * limit;
    entries = entries.slice(offset, offset + limit);

    sendSuccess(res, { entries, total, page, limit });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const entry = await this.service.getById(id);
    if (!entry) throw new NotFoundError('PublicContent');
    sendSuccess(res, entry);
  };

  getByCategory = async (req: Request, res: Response): Promise<void> => {
    const category = String(req.params.category);
    const result = await this.service.getByCategory(category as never);
    sendSuccess(res, { entries: result.entries, total: result.entries.length, category, hasData: result.hasData });
  };

  search = async (req: Request, res: Response): Promise<void> => {
    const query = String(req.query.q || '');
    if (!query.trim()) throw new ValidationError('Search query is required');
    const result = await this.service.search(query);
    sendSuccess(res, { entries: result.entries, total: result.entries.length, category: result.category });
  };

  getCategoryCounts = async (_req: Request, res: Response): Promise<void> => {
    const counts = await this.service.getCategoryCounts();
    sendSuccess(res, { categories: counts });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = createPublicContentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());

    const entry = await this.service.create(parsed.data);
    sendSuccess(res, entry, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = updatePublicContentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());

    const entry = await this.service.update(id, parsed.data);
    sendSuccess(res, entry);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.service.delete(id);
    sendSuccess(res, { message: 'Public content deleted successfully' });
  };
}
