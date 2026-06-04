"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeliveryRoutes = createDeliveryRoutes;
const express_1 = require("express");
const delivery_controller_1 = require("../controller/delivery.controller");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const delivery_validators_1 = require("../validators/delivery.validators");
function createDeliveryRoutes(io) {
    const router = (0, express_1.Router)();
    const controller = (0, delivery_controller_1.createDeliveryController)(io);
    router.use(auth_middleware_1.authMiddleware);
    router.get('/', (0, role_middleware_1.requirePermission)('deliveries.read', 'audit.read'), (0, validate_middleware_1.validate)(delivery_validators_1.listDeliveriesSchema), controller.list.bind(controller));
    router.get('/my', (0, role_middleware_1.requirePermission)('deliveries.read', 'courier.app'), controller.myDeliveries.bind(controller));
    router.get('/:id', (0, role_middleware_1.requirePermission)('deliveries.read', 'audit.read', 'courier.app'), (0, validate_middleware_1.validate)(delivery_validators_1.getDeliverySchema), controller.getById.bind(controller));
    router.patch('/:id/status', (0, role_middleware_1.requirePermission)('deliveries.write', 'courier.app'), (0, validate_middleware_1.validate)(delivery_validators_1.updateDeliveryStatusSchema), controller.updateStatus.bind(controller));
    return router;
}
