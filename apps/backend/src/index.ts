import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './infra/database/prisma';
import { connectRedis, disconnectRedis } from './infra/redis/client';
import { ensureUploadDir } from './infra/storage/fileStorage';
import { errorHandler } from './middlewares/errorHandler';
import { globalRateLimiter } from './middlewares/rateLimit.middleware';
import { requestLogger } from './middlewares/requestLogger.middleware';
import { authMiddleware } from './middlewares/auth.middleware';
import { setupSocketIO } from './sockets';
import healthRoutes from './modules/health/health.routes';

import authRoutes from './modules/auth/routes/auth.routes';
import { createDeliveryRoutes } from './modules/deliveries/routes/delivery.routes';
import pendingPrepRoutes from './modules/pending-prep/routes/pending-prep.routes';
import excelImportRoutes from './modules/excel-imports/routes/excel-import.routes';
import { createAssignmentRoutes } from './modules/assignments/routes/assignment.routes';
import callRoutes from './modules/calls/routes/call.routes';
import { createIncidentRoutes, createEvidenceRoutes } from './modules/incidents/routes/incident.routes';
import { createOfflineSyncRoutes } from './modules/offline-sync/routes/offline-sync.routes';
import gpsRoutes from './modules/gps-logs/routes/gps.routes';
import dashboardRoutes from './modules/audit-logs/routes/dashboard.routes';
import auditRoutes from './modules/audit-logs/routes/audit.routes';
import userRoutes from './modules/users/routes/user.routes';
import roleRoutes from './modules/roles/routes/role.routes';
import patientRoutes from './modules/patients/routes/patient.routes';
import deliveryStatusRoutes from './modules/deliveries/routes/delivery-status.routes';
import notificationRoutes from './modules/notifications/routes/notification.routes';
import medicationRoutes from './modules/medications/routes/medication.routes';
import reportsRoutes from './modules/reports/routes/reports.routes';
import { createCourierRoutes } from './modules/couriers/routes/courier.routes';
import { createIntermunicipalRouteRoutes } from './modules/intermunicipal-routes/routes/intermunicipal-route.routes';

const app = express();
const httpServer = createServer(app);

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  },
});

setupSocketIO(io);

app.use(requestLogger);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','), credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(healthRoutes);

app.use(globalRateLimiter);

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'A-AS Delivery',
      version: '1.0.0',
      description: 'API de trazabilidad farmacéutica y logística',
    },
    servers: [{ url: `http://localhost:${env.PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/deliveries', createDeliveryRoutes(io));
app.use('/api/delivery-status', authMiddleware, deliveryStatusRoutes);
app.use('/api/excel-imports', excelImportRoutes);
app.use('/api/pending-prep', authMiddleware, pendingPrepRoutes);
app.use('/api/assignments', authMiddleware, createAssignmentRoutes(io));
app.use('/api/calls', authMiddleware, callRoutes);
app.use('/api/incidents', authMiddleware, createIncidentRoutes(io));
app.use('/api/evidence', authMiddleware, createEvidenceRoutes());
app.use('/api/offline-sync', authMiddleware, createOfflineSyncRoutes(io));
app.use('/api/gps', authMiddleware, gpsRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/audit-logs', authMiddleware, auditRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/roles', authMiddleware, roleRoutes);
app.use('/api/patients', authMiddleware, patientRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/medications', authMiddleware, medicationRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/couriers', authMiddleware, createCourierRoutes(io));
app.use('/api/intermunicipal-routes', authMiddleware, createIntermunicipalRouteRoutes(io));

app.use(errorHandler);

async function bootstrap() {
  await connectDatabase();
  await connectRedis();
  await ensureUploadDir();

  httpServer.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${env.PORT} (0.0.0.0)`);
    logger.info(`Swagger docs: http://localhost:${env.PORT}/api/docs`);
  });
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down');
  await disconnectDatabase();
  await disconnectRedis();
  process.exit(0);
});

bootstrap().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});

export { app, io };
