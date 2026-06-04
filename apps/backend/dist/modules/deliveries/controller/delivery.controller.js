"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryController = void 0;
exports.createDeliveryController = createDeliveryController;
const delivery_service_1 = require("../service/delivery.service");
const deliveryService = new delivery_service_1.DeliveryService();
class DeliveryController {
    io;
    constructor(io) {
        this.io = io;
    }
    async list(req, res, next) {
        try {
            const result = await deliveryService.list(req.query);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const delivery = await deliveryService.getById(req.params.id);
            res.json({ success: true, data: delivery });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const delivery = await deliveryService.updateStatus(req.params.id, req.user.sub, req.body);
            const event = delivery.status === 'DELIVERED'
                ? 'delivery.completed'
                : 'delivery.updated';
            this.io?.emit(event, delivery);
            res.json({ success: true, data: delivery });
        }
        catch (error) {
            next(error);
        }
    }
    async myDeliveries(req, res, next) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 50;
            const result = await deliveryService.getCourierDeliveries(req.user.sub, page, limit);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DeliveryController = DeliveryController;
function createDeliveryController(io) {
    return new DeliveryController(io);
}
