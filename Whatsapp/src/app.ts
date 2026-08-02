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
import aiRoutes from './modules/ai/ai.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import studentsRoutes from './modules/students/students.routes.js';
import facultyRoutes from './modules/faculty/faculty.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';

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
  app.use(`${API_PREFIX}/ai`, aiRoutes);
  app.use(`${API_PREFIX}/attendance`, attendanceRoutes);
  app.use(`${API_PREFIX}/students`, studentsRoutes);
  app.use(`${API_PREFIX}/faculty`, facultyRoutes);
  app.use(`${API_PREFIX}/notifications`, notificationsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
