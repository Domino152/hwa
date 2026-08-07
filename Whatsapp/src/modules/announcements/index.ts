import { MongoAnnouncementRepository } from '../../repositories/mongodb/announcement.repository.js';
import { AnnouncementService } from './announcement.service.js';

const announcementRepo = new MongoAnnouncementRepository();
export const announcementService = new AnnouncementService(announcementRepo);

export { AnnouncementService } from './announcement.service.js';
export { AnnouncementController } from './announcement.controller.js';
