"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const prisma_1 = require("./infra/database/prisma");
const client_1 = require("./infra/redis/client");
const fileStorage_1 = require("./infra/storage/fileStorage");
const errorHandler_1 = require("./middlewares/errorHandler");
const rateLimit_middleware_1 = require("./middlewares/rateLimit.middleware");
const requestLogger_middleware_1 = require("./middlewares/requestLogger.middleware");
const auth_middleware_1 = require("./middlewares/auth.middleware");
const sockets_1 = require("./sockets");
const health_routes_1 = __importDefault(require("./modules/health/health.routes"));
const auth_routes_1 = __importDefault(require("./modules/auth/routes/auth.routes"));
const delivery_routes_1 = require("./modules/deliveries/routes/delivery.routes");
const excel_import_routes_1 = __importDefault(require("./modules/excel-imports/routes/excel-import.routes"));
const assignment_routes_1 = require("./modules/assignments/routes/assignment.routes");
const call_routes_1 = __importDefault(require("./modules/calls/routes/call.routes"));
const incident_routes_1 = require("./modules/incidents/routes/incident.routes");
const offline_sync_routes_1 = require("./modules/offline-sync/routes/offline-sync.routes");
const gps_routes_1 = __importDefault(require("./modules/gps-logs/routes/gps.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/audit-logs/routes/dashboard.routes"));
const audit_routes_1 = __importDefault(require("./modules/audit-logs/routes/audit.routes"));
const user_routes_1 = __importDefault(require("./modules/users/routes/user.routes"));
const role_routes_1 = __importDefault(require("./modules/roles/routes/role.routes"));
const patient_routes_1 = __importDefault(require("./modules/patients/routes/patient.routes"));
const delivery_status_routes_1 = __importDefault(require("./modules/deliveries/routes/delivery-status.routes"));
const notification_routes_1 = __importDefault(require("./modules/notifications/routes/notification.routes"));
const medication_routes_1 = __importDefault(require("./modules/medications/routes/medication.routes"));
const reports_routes_1 = __importDefault(require("./modules/reports/routes/reports.routes"));
const courier_routes_1 = require("./modules/couriers/routes/courier.routes");
const intermunicipal_route_routes_1 = require("./modules/intermunicipal-routes/routes/intermunicipal-route.routes");
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: env_1.env.CORS_ORIGIN === '*' ? true : env_1.env.CORS_ORIGIN.split(','),
        credentials: true,
    },
});
exports.io = io;
(0, sockets_1.setupSocketIO)(io);
app.use(requestLogger_middleware_1.requestLogger);
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)({ origin: env_1.env.CORS_ORIGIN === '*' ? true : env_1.env.CORS_ORIGIN.split(','), credentials: true }));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(health_routes_1.default);
app.use(rateLimit_middleware_1.globalRateLimiter);
const swaggerSpec = (0, swagger_jsdoc_1.default)({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'A-AS Delivery',
            version: '1.0.0',
            description: 'API de trazabilidad farmacéutica y logística',
        },
        servers: [{ url: `http://localhost:${env_1.env.PORT}` }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
        },
    },
    apis: ['./src/modules/**/*.routes.ts'],
});
app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/deliveries', (0, delivery_routes_1.createDeliveryRoutes)(io));
app.use('/api/delivery-status', auth_middleware_1.authMiddleware, delivery_status_routes_1.default);
app.use('/api/excel-imports', excel_import_routes_1.default);
app.use('/api/assignments', auth_middleware_1.authMiddleware, (0, assignment_routes_1.createAssignmentRoutes)(io));
app.use('/api/calls', auth_middleware_1.authMiddleware, call_routes_1.default);
app.use('/api/incidents', auth_middleware_1.authMiddleware, (0, incident_routes_1.createIncidentRoutes)(io));
app.use('/api/evidence', auth_middleware_1.authMiddleware, (0, incident_routes_1.createEvidenceRoutes)());
app.use('/api/offline-sync', auth_middleware_1.authMiddleware, (0, offline_sync_routes_1.createOfflineSyncRoutes)(io));
app.use('/api/gps', auth_middleware_1.authMiddleware, gps_routes_1.default);
app.use('/api/dashboard', auth_middleware_1.authMiddleware, dashboard_routes_1.default);
app.use('/api/audit-logs', auth_middleware_1.authMiddleware, audit_routes_1.default);
app.use('/api/users', auth_middleware_1.authMiddleware, user_routes_1.default);
app.use('/api/roles', auth_middleware_1.authMiddleware, role_routes_1.default);
app.use('/api/patients', auth_middleware_1.authMiddleware, patient_routes_1.default);
app.use('/api/notifications', auth_middleware_1.authMiddleware, notification_routes_1.default);
app.use('/api/medications', auth_middleware_1.authMiddleware, medication_routes_1.default);
app.use('/api/reports', auth_middleware_1.authMiddleware, reports_routes_1.default);
app.use('/api/couriers', auth_middleware_1.authMiddleware, (0, courier_routes_1.createCourierRoutes)(io));
app.use('/api/intermunicipal-routes', auth_middleware_1.authMiddleware, (0, intermunicipal_route_routes_1.createIntermunicipalRouteRoutes)(io));
app.use(errorHandler_1.errorHandler);
async function bootstrap() {
    await (0, prisma_1.connectDatabase)();
    await (0, client_1.connectRedis)();
    await (0, fileStorage_1.ensureUploadDir)();
    httpServer.listen(env_1.env.PORT, '0.0.0.0', () => {
        logger_1.logger.info(`Server running on port ${env_1.env.PORT} (0.0.0.0)`);
        logger_1.logger.info(`Swagger docs: http://localhost:${env_1.env.PORT}/api/docs`);
    });
}
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, shutting down');
    await (0, prisma_1.disconnectDatabase)();
    await (0, client_1.disconnectRedis)();
    process.exit(0);
});
bootstrap().catch((err) => {
    logger_1.logger.error('Failed to start server', { err });
    process.exit(1);
});
