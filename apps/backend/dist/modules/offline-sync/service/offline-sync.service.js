"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineSyncService = void 0;
exports.createOfflineSyncService = createOfflineSyncService;
const prisma_1 = require("../../../infra/database/prisma");
const delivery_service_1 = require("../../deliveries/service/delivery.service");
const incident_service_1 = require("../../incidents/service/incident.service");
const incident_service_2 = require("../../incidents/service/incident.service");
const logger_1 = require("../../../config/logger");
const SYNC_TYPE_ORDER = {
    GPS: 0,
    EVIDENCE: 1,
    SIGNATURE: 1,
    INCIDENT: 2,
    STATUS_UPDATE: 3,
};
function sortSyncItems(items) {
    return [...items].sort((a, b) => (SYNC_TYPE_ORDER[a.type] ?? 99) - (SYNC_TYPE_ORDER[b.type] ?? 99));
}
class OfflineSyncService {
    io;
    deliveryService = new delivery_service_1.DeliveryService();
    incidentService = (0, incident_service_2.createIncidentService)();
    constructor(io) {
        this.io = io;
        this.incidentService = (0, incident_service_2.createIncidentService)(io);
    }
    async processSync(userId, deviceId, items) {
        const syncRecord = await prisma_1.prisma.offlineSync.create({
            data: {
                userId,
                deviceId,
                payload: items,
                status: 'SYNCING',
            },
        });
        const results = [];
        for (const item of sortSyncItems(items)) {
            try {
                switch (item.type) {
                    case 'STATUS_UPDATE':
                        await this.deliveryService.updateStatus(item.payload.deliveryId, userId, item.payload);
                        break;
                    case 'GPS':
                        await prisma_1.prisma.gpsLog.create({
                            data: {
                                userId,
                                deliveryId: item.payload.deliveryId,
                                lat: item.payload.lat,
                                lng: item.payload.lng,
                                accuracy: item.payload.accuracy,
                                deviceId,
                            },
                        });
                        break;
                    case 'INCIDENT':
                        await this.incidentService.create({
                            deliveryId: item.payload.deliveryId,
                            reportedById: userId,
                            type: item.payload.type,
                            description: item.payload.description,
                            lat: item.payload.lat,
                            lng: item.payload.lng,
                            accuracy: item.payload.accuracy,
                        });
                        break;
                    case 'EVIDENCE':
                    case 'SIGNATURE':
                        if (item.payload.base64) {
                            const buffer = Buffer.from(item.payload.base64, 'base64');
                            await incident_service_1.evidenceService.upload({
                                deliveryId: item.payload.deliveryId,
                                uploadedById: userId,
                                type: item.type === 'SIGNATURE' ? 'SIGNATURE' : 'PHOTO',
                                buffer,
                                fileName: item.payload.fileName || 'evidence.jpg',
                                lat: item.payload.lat,
                                lng: item.payload.lng,
                            });
                        }
                        break;
                }
                results.push({ id: item.id, success: true });
            }
            catch (err) {
                results.push({
                    id: item.id,
                    success: false,
                    error: err instanceof Error ? err.message : 'Sync failed',
                });
            }
        }
        const failed = results.filter((r) => !r.success);
        await prisma_1.prisma.offlineSync.update({
            where: { id: syncRecord.id },
            data: {
                status: failed.length === 0 ? 'COMPLETED' : failed.length === items.length ? 'FAILED' : 'CONFLICT',
                syncedAt: new Date(),
                lastError: failed.length > 0 ? JSON.stringify(failed) : null,
                retryCount: { increment: 1 },
            },
        });
        logger_1.logger.info('Offline sync processed', { userId, deviceId, total: items.length, failed: failed.length });
        return { syncId: syncRecord.id, results };
    }
    async listPending(userId) {
        return prisma_1.prisma.offlineSync.findMany({
            where: { userId, status: { in: ['PENDING', 'FAILED'] } },
            orderBy: { createdAt: 'asc' },
        });
    }
}
exports.OfflineSyncService = OfflineSyncService;
function createOfflineSyncService(io) {
    return new OfflineSyncService(io);
}
