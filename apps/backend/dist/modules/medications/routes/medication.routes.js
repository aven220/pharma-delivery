"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const medication_service_1 = require("../service/medication.service");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const createSchema = zod_1.z.object({
    body: zod_1.z.object({
        cum: zod_1.z.string().optional(),
        code: zod_1.z.string().min(1),
        name: zod_1.z.string().min(1),
        laboratory: zod_1.z.string().optional(),
        presentation: zod_1.z.string().optional(),
        concentration: zod_1.z.string().optional(),
        status: zod_1.z.nativeEnum(client_1.MedicationStatus).optional(),
    }),
});
const updateSchema = zod_1.z.object({
    body: zod_1.z.object({
        cum: zod_1.z.string().optional(),
        code: zod_1.z.string().min(1).optional(),
        name: zod_1.z.string().min(1).optional(),
        laboratory: zod_1.z.string().optional(),
        presentation: zod_1.z.string().optional(),
        concentration: zod_1.z.string().optional(),
        status: zod_1.z.nativeEnum(client_1.MedicationStatus).optional(),
    }),
});
const router = (0, express_1.Router)();
router.get('/', (0, role_middleware_1.requirePermission)('medications.read', 'medications.write', 'audit.read'), async (req, res, next) => {
    try {
        const result = await medication_service_1.medicationService.list(Number(req.query.page) || 1, Number(req.query.limit) || 20, req.query.search, req.query.status);
        res.json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
});
router.get('/search', (0, role_middleware_1.requirePermission)('medications.read', 'medications.write', 'patients.write', 'deliveries.write'), async (req, res, next) => {
    try {
        const data = await medication_service_1.medicationService.search(req.query.q, Number(req.query.limit) || 10);
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.get('/by-cum/:cum', (0, role_middleware_1.requirePermission)('medications.read', 'medications.write', 'patients.write'), async (req, res, next) => {
    try {
        const data = await medication_service_1.medicationService.getByCum(req.params.cum);
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', (0, role_middleware_1.requirePermission)('medications.write'), (0, validate_middleware_1.validate)(createSchema), async (req, res, next) => {
    try {
        const data = await medication_service_1.medicationService.create(req.body);
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/:id', (0, role_middleware_1.requirePermission)('medications.write'), (0, validate_middleware_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const data = await medication_service_1.medicationService.update(req.params.id, req.body);
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.post('/import', (0, role_middleware_1.requirePermission)('medications.import', 'medications.write'), upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'File required' });
            return;
        }
        const data = await medication_service_1.medicationService.bulkImport(req.file.buffer);
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
