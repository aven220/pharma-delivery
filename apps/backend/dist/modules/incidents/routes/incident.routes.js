"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIncidentRoutes = createIncidentRoutes;
exports.createEvidenceRoutes = createEvidenceRoutes;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const incident_service_1 = require("../service/incident.service");
const env_1 = require("../../../config/env");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: env_1.env.MAX_FILE_SIZE } });
const incidentSchema = zod_1.z.object({
    body: zod_1.z.object({
        deliveryId: zod_1.z.string().cuid(),
        type: zod_1.z.nativeEnum(client_1.IncidentType),
        description: zod_1.z.string().min(1),
        lat: zod_1.z.number().optional(),
        lng: zod_1.z.number().optional(),
        accuracy: zod_1.z.number().optional(),
    }),
});
function createIncidentRoutes(io) {
    const router = (0, express_1.Router)();
    const incidentService = (0, incident_service_1.createIncidentService)(io);
    router.post('/', (0, validate_middleware_1.validate)(incidentSchema), async (req, res, next) => {
        try {
            const incident = await incidentService.create({
                ...req.body,
                reportedById: req.user.sub,
            });
            res.status(201).json({ success: true, data: incident });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/', async (req, res, next) => {
        try {
            const result = await incidentService.list({
                deliveryId: req.query.deliveryId,
                page: Number(req.query.page) || 1,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
function createEvidenceRoutes() {
    const router = (0, express_1.Router)();
    router.post('/', upload.single('file'), async (req, res, next) => {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, error: 'File required' });
                return;
            }
            const evidence = await incident_service_1.evidenceService.upload({
                deliveryId: req.body.deliveryId,
                uploadedById: req.user.sub,
                type: req.body.type || 'PHOTO',
                buffer: req.file.buffer,
                fileName: req.file.originalname,
                incidentId: req.body.incidentId,
                lat: req.body.lat ? Number(req.body.lat) : undefined,
                lng: req.body.lng ? Number(req.body.lng) : undefined,
            });
            res.status(201).json({ success: true, data: evidence });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/delivery/:deliveryId', (0, role_middleware_1.requirePermission)('deliveries.read', 'audit.read', 'dashboard.read', 'courier.app'), async (req, res, next) => {
        try {
            const evidence = await incident_service_1.evidenceService.listByDelivery((0, auth_middleware_1.routeParam)(req.params.deliveryId));
            res.json({ success: true, data: evidence });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/:id/file', (0, role_middleware_1.requirePermission)('deliveries.read', 'audit.read', 'dashboard.read', 'courier.app'), async (req, res, next) => {
        try {
            const { evidence, fullPath } = await incident_service_1.evidenceService.getFile((0, auth_middleware_1.routeParam)(req.params.id));
            res.setHeader('Content-Type', evidence.mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${evidence.fileName}"`);
            res.sendFile(path_1.default.resolve(fullPath));
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
