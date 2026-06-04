"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceService = exports.EvidenceService = exports.IncidentService = void 0;
exports.createIncidentService = createIncidentService;
const prisma_1 = require("../../../infra/database/prisma");
const AppError_1 = require("../../../shared/errors/AppError");
const fileStorage_1 = require("../../../infra/storage/fileStorage");
const env_1 = require("../../../config/env");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
class IncidentService {
    io;
    constructor(io) {
        this.io = io;
    }
    async create(input) {
        const delivery = await prisma_1.prisma.delivery.findFirst({
            where: { id: input.deliveryId, deletedAt: null },
        });
        if (!delivery)
            throw new AppError_1.NotFoundError('Delivery');
        const incident = await prisma_1.prisma.incident.create({
            data: input,
        });
        this.io?.emit('incident.created', {
            id: incident.id,
            deliveryId: incident.deliveryId,
            type: incident.type,
        });
        return incident;
    }
    async list(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const where = {
            deletedAt: null,
            ...(filters.deliveryId && { deliveryId: filters.deliveryId }),
            ...(filters.status && { status: filters.status }),
        };
        const [data, total] = await Promise.all([
            prisma_1.prisma.incident.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    reportedBy: { select: { firstName: true, lastName: true } },
                    evidence: true,
                },
            }),
            prisma_1.prisma.incident.count({ where }),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
}
exports.IncidentService = IncidentService;
class EvidenceService {
    async upload(input) {
        const delivery = await prisma_1.prisma.delivery.findFirst({
            where: { id: input.deliveryId, deletedAt: null },
        });
        if (!delivery)
            throw new AppError_1.NotFoundError('Delivery');
        if (input.type === 'PHOTO') {
            const photoCount = await prisma_1.prisma.evidence.count({
                where: { deliveryId: input.deliveryId, type: 'PHOTO', deletedAt: null },
            });
            if (photoCount >= 2) {
                throw new AppError_1.ValidationError('Máximo 2 fotografías permitidas por entrega');
            }
        }
        const saved = await (0, fileStorage_1.saveEvidenceFile)(input.buffer, input.fileName);
        return prisma_1.prisma.evidence.create({
            data: {
                deliveryId: input.deliveryId,
                incidentId: input.incidentId,
                uploadedById: input.uploadedById,
                type: input.type,
                filePath: saved.filePath,
                fileName: input.fileName,
                mimeType: saved.mimeType,
                fileSize: saved.fileSize,
                lat: input.lat,
                lng: input.lng,
            },
        });
    }
    async listByDelivery(deliveryId) {
        const items = await prisma_1.prisma.evidence.findMany({
            where: { deliveryId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: {
                uploadedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        return items.map((item) => ({
            id: item.id,
            deliveryId: item.deliveryId,
            type: item.type,
            fileName: item.fileName,
            mimeType: item.mimeType,
            fileSize: item.fileSize,
            lat: item.lat,
            lng: item.lng,
            createdAt: item.createdAt,
            uploadedBy: item.uploadedBy,
            fileUrl: `/api/evidence/${item.id}/file`,
        }));
    }
    async getFile(id) {
        const evidence = await prisma_1.prisma.evidence.findFirst({
            where: { id, deletedAt: null },
        });
        if (!evidence)
            throw new AppError_1.NotFoundError('Evidence');
        const fullPath = path_1.default.join(env_1.env.UPLOAD_DIR, evidence.filePath);
        try {
            await promises_1.default.access(fullPath);
        }
        catch {
            throw new AppError_1.NotFoundError('Evidence file');
        }
        return { evidence, fullPath };
    }
}
exports.EvidenceService = EvidenceService;
function createIncidentService(io) {
    return new IncidentService(io);
}
exports.evidenceService = new EvidenceService();
