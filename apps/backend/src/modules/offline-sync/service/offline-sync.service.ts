import { prisma } from '../../../infra/database/prisma';
import { DeliveryService } from '../../deliveries/service/delivery.service';
import { evidenceService } from '../../incidents/service/incident.service';
import { createIncidentService } from '../../incidents/service/incident.service';
import { logger } from '../../../config/logger';
import type { Server } from 'socket.io';

interface SyncItem {
  id: string;
  type: 'STATUS_UPDATE' | 'EVIDENCE' | 'INCIDENT' | 'GPS' | 'SIGNATURE';
  payload: Record<string, unknown>;
}

const SYNC_TYPE_ORDER: Record<SyncItem['type'], number> = {
  GPS: 0,
  EVIDENCE: 1,
  SIGNATURE: 1,
  INCIDENT: 2,
  STATUS_UPDATE: 3,
};

function sortSyncItems(items: SyncItem[]): SyncItem[] {
  return [...items].sort(
    (a, b) => (SYNC_TYPE_ORDER[a.type] ?? 99) - (SYNC_TYPE_ORDER[b.type] ?? 99)
  );
}

export class OfflineSyncService {
  private deliveryService = new DeliveryService();
  private incidentService = createIncidentService();

  constructor(private io?: Server) {
    this.incidentService = createIncidentService(io);
  }

  async processSync(userId: string, deviceId: string, items: SyncItem[]) {
    const syncRecord = await prisma.offlineSync.create({
      data: {
        userId,
        deviceId,
        payload: items as never,
        status: 'SYNCING',
      },
    });

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const item of sortSyncItems(items)) {
      try {
        switch (item.type) {
          case 'STATUS_UPDATE':
            await this.deliveryService.updateStatus(
              item.payload.deliveryId as string,
              userId,
              item.payload as never
            );
            break;
          case 'GPS':
            await prisma.gpsLog.create({
              data: {
                userId,
                deliveryId: item.payload.deliveryId as string,
                lat: item.payload.lat as number,
                lng: item.payload.lng as number,
                accuracy: item.payload.accuracy as number,
                deviceId,
              },
            });
            break;
          case 'INCIDENT':
            await this.incidentService.create({
              deliveryId: item.payload.deliveryId as string,
              reportedById: userId,
              type: item.payload.type as never,
              description: item.payload.description as string,
              lat: item.payload.lat as number,
              lng: item.payload.lng as number,
              accuracy: item.payload.accuracy as number,
            });
            break;
          case 'EVIDENCE':
          case 'SIGNATURE':
            if (item.payload.base64) {
              const buffer = Buffer.from(item.payload.base64 as string, 'base64');
              await evidenceService.upload({
                deliveryId: item.payload.deliveryId as string,
                uploadedById: userId,
                type: item.type === 'SIGNATURE' ? 'SIGNATURE' : 'PHOTO',
                buffer,
                fileName: (item.payload.fileName as string) || 'evidence.jpg',
                lat: item.payload.lat as number,
                lng: item.payload.lng as number,
              });
            }
            break;
        }
        results.push({ id: item.id, success: true });
      } catch (err) {
        results.push({
          id: item.id,
          success: false,
          error: err instanceof Error ? err.message : 'Sync failed',
        });
      }
    }

    const failed = results.filter((r) => !r.success);
    await prisma.offlineSync.update({
      where: { id: syncRecord.id },
      data: {
        status: failed.length === 0 ? 'COMPLETED' : failed.length === items.length ? 'FAILED' : 'CONFLICT',
        syncedAt: new Date(),
        lastError: failed.length > 0 ? JSON.stringify(failed) : null,
        retryCount: { increment: 1 },
      },
    });

    logger.info('Offline sync processed', { userId, deviceId, total: items.length, failed: failed.length });
    return { syncId: syncRecord.id, results };
  }

  async listPending(userId: string) {
    return prisma.offlineSync.findMany({
      where: { userId, status: { in: ['PENDING', 'FAILED'] } },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export function createOfflineSyncService(io?: Server) {
  return new OfflineSyncService(io);
}
