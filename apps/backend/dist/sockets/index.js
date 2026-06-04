"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = void 0;
exports.setupSocketIO = setupSocketIO;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const prisma_1 = require("../infra/database/prisma");
function setupSocketIO(io) {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            next(new Error('Authentication required'));
            return;
        }
        try {
            const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
            socket.data.user = payload;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const user = socket.data.user;
        logger_1.logger.info('Socket connected', { userId: user.sub, role: user.role });
        socket.join(`user:${user.sub}`);
        socket.join(`role:${user.role}`);
        if (user.role === 'COURIER' || user.role === 'DOMICILIARIO') {
            socket.join('couriers');
        }
        if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
            socket.join('admin');
        }
        socket.on('gps:update', (data) => {
            prisma_1.prisma.courier.update({
                where: { userId: user.sub },
                data: {
                    currentLat: data.lat,
                    currentLng: data.lng,
                    lastGpsAt: new Date(),
                    lastConnectedAt: new Date(),
                },
            }).catch(() => { });
            socket.to('admin').emit('courier:location', {
                userId: user.sub,
                ...data,
                timestamp: new Date().toISOString(),
            });
        });
        if (user.role === 'COURIER' || user.role === 'DOMICILIARIO') {
            prisma_1.prisma.courier.update({
                where: { userId: user.sub },
                data: { lastConnectedAt: new Date() },
            }).catch(() => { });
        }
        socket.on('disconnect', () => {
            logger_1.logger.debug('Socket disconnected', { userId: user.sub });
        });
    });
}
exports.SOCKET_EVENTS = {
    DELIVERY_CREATED: 'delivery.created',
    DELIVERY_UPDATED: 'delivery.updated',
    DELIVERY_COMPLETED: 'delivery.completed',
    ASSIGNMENT_CREATED: 'assignment.created',
    ASSIGNMENT_UPDATED: 'assignment.updated',
    INCIDENT_CREATED: 'incident.created',
};
