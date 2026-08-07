import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { API_PREFIX } from './config/constants.js';
import { requestLogger } from './middleware/request-logger.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import whatsappRoutes, { chatService } from './modules/whatsapp/whatsapp.routes.js';
import { createHealthRoutes } from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import feeRoutes from './modules/fees/fee.routes.js';
import resultRoutes from './modules/results/result.routes.js';
import detailedResultRoutes from './modules/detailed-results/detailed-result.routes.js';
import scheduleRoutes from './modules/schedule/schedule.routes.js';
import subjectRoutes from './modules/subjects/subject.routes.js';
import announcementRoutes from './modules/announcements/announcement.routes.js';
import studentRoutes from './modules/students/students.routes.js';
import parentRoutes from './modules/parents/parent.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import assignmentRoutes from './modules/assignments/assignment.routes.js';
import publicInfoRoutes from './modules/public-info/public-info.routes.js';
import { createAIRoutes } from './modules/ai/index.js';
import { getAIService } from './modules/ai/index.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGINS.split(',').map((o) => o.trim()), credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(rateLimiter);
  app.use(requestLogger);

  const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'College WhatsApp Assistant API',
        version: '1.0.0',
        description: 'Production-ready backend for College WhatsApp Assistant',
      },
      servers: [{ url: `/api/v1`, version: '1.0.0' }],
    },
    apis: ['./docs/*.ts'],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(API_PREFIX, createHealthRoutes(chatService));
  app.use(`${API_PREFIX}/whatsapp`, whatsappRoutes);
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/attendance`, attendanceRoutes);
  app.use(`${API_PREFIX}/fees`, feeRoutes);
app.use(`${API_PREFIX}/results`, resultRoutes);
  app.use(`${API_PREFIX}/detailed-results`, detailedResultRoutes);
  app.use(`${API_PREFIX}/schedule`, scheduleRoutes);
  app.use(`${API_PREFIX}/subjects`, subjectRoutes);
  app.use(`${API_PREFIX}/announcements`, announcementRoutes);
  app.use(`${API_PREFIX}/students`, studentRoutes);
  app.use(`${API_PREFIX}/parents`, parentRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
  app.use(`${API_PREFIX}/assignments`, assignmentRoutes);
  app.use(`${API_PREFIX}/public-info`, publicInfoRoutes);
  app.use(`${API_PREFIX}/ai`, createAIRoutes(getAIService()));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
