import { prisma } from '../../../infra/database/prisma';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { saveEvidenceFile } from '../../../infra/storage/fileStorage';
import { env } from '../../../config/env';
import path from 'path';
import fs from 'fs/promises';
import type { IncidentType, EvidenceType } from '@prisma/client';
import type { Server } from 'socket.io';

export class IncidentService {
  constructor(private io?: Server) {}

  async create(input: {
    deliveryId: string;
    reportedById: string;
    type: IncidentType;
    description: string;
    lat?: number;
    lng?: number;
    accuracy?: number;
  }) {
    const delivery = await prisma.delivery.findFirst({
      where: { id: input.deliveryId, deletedAt: null },
    });
    if (!delivery) throw new NotFoundError('Delivery');

    const incident = await prisma.incident.create({
      data: input,
    });

    this.io?.emit('incident.created', {
      id: incident.id,
      deliveryId: incident.deliveryId,
      type: incident.type,
    });

    return incident;
  }

  async list(filters: { deliveryId?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(filters.deliveryId && { deliveryId: filters.deliveryId }),
      ...(filters.status && { status: filters.status as never }),
    };

    const [data, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reportedBy: { select: { firstName: true, lastName: true } },
          evidence: true,
        },
      }),
      prisma.incident.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}

export class EvidenceService {
  async upload(input: {
    deliveryId: string;
    uploadedById: string;
    type: EvidenceType;
    buffer: Buffer;
    fileName: string;
    incidentId?: string;
    lat?: number;
    lng?: number;
  }) {
    const delivery = await prisma.delivery.findFirst({
      where: { id: input.deliveryId, deletedAt: null },
    });
    if (!delivery) throw new NotFoundError('Delivery');

    if (input.type === 'PHOTO') {
      const photoCount = await prisma.evidence.count({
        where: { deliveryId: input.deliveryId, type: 'PHOTO', deletedAt: null },
      });
      if (photoCount >= 2) {
        throw new ValidationError('Máximo 2 fotografías permitidas por entrega');
      }
    }

    const saved = await saveEvidenceFile(input.buffer, input.fileName);

    return prisma.evidence.create({
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

  async listByDelivery(deliveryId: string) {
    const items = await prisma.evidence.findMany({
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

  async getFile(id: string) {
    const evidence = await prisma.evidence.findFirst({
      where: { id, deletedAt: null },
    });
    if (!evidence) throw new NotFoundError('Evidence');

    const fullPath = path.join(env.UPLOAD_DIR, evidence.filePath);
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundError('Evidence file');
    }

    return { evidence, fullPath };
  }
}

export function createIncidentService(io?: Server) {
  return new IncidentService(io);
}

export const evidenceService = new EvidenceService();
