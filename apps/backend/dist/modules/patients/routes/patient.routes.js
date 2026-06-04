"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const patient_service_1 = require("../service/patient.service");
const patient_validators_1 = require("../validators/patient.validators");
const router = (0, express_1.Router)();
router.get('/', (0, role_middleware_1.requirePermission)('patients.read', 'audit.read'), (0, validate_middleware_1.validate)(patient_validators_1.listPatientsSchema), async (req, res, next) => {
    try {
        const result = await patient_service_1.patientService.list(Number(req.query.page) || 1, Number(req.query.limit) || 20, req.query.search);
        res.json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', (0, role_middleware_1.requirePermission)('patients.read', 'audit.read'), (0, validate_middleware_1.validate)(patient_validators_1.patientIdSchema), async (req, res, next) => {
    try {
        const patient = await patient_service_1.patientService.getById(req.params.id);
        res.json({ success: true, data: patient });
    }
    catch (error) {
        next(error);
    }
});
router.post('/manual', (0, role_middleware_1.requirePermission)('patients.write'), (0, validate_middleware_1.validate)(patient_validators_1.createPatientManualSchema), async (req, res, next) => {
    try {
        const result = await patient_service_1.patientService.createManualWithDelivery(req.body, { rejectDuplicate: true });
        res.status(201).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
});
router.post('/deliveries/manual', (0, role_middleware_1.requirePermission)('deliveries.write'), (0, validate_middleware_1.validate)(patient_validators_1.createDeliveryManualSchema), async (req, res, next) => {
    try {
        const result = await patient_service_1.patientService.createDeliveryForPatient(req.body);
        res.status(201).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id/history', (0, role_middleware_1.requirePermission)('patients.read', 'audit.read', 'calls.read'), (0, validate_middleware_1.validate)(patient_validators_1.patientIdSchema), async (req, res, next) => {
    try {
        const history = await patient_service_1.patientService.getFullHistory(req.params.id);
        res.json({ success: true, data: history });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
