import { prisma } from '../../../infra/database/prisma';
import { getRedis } from '../../../infra/redis/client';

const PREP_STATUSES = ['LIBRE', 'EMPACADO', 'RECHAZADO'] as const;

export async function getDataHealth() {
  const [
    dbPing,
    redisPing,
    deliveryByStatus,
    patientCount,
    lastImport,
    activeOperators,
    pendingCalls,
    dbSize,
  ] = await Promise.all([
    prisma.$queryRaw<[{ ok: number }]>`SELECT 1 as ok`,
    getRedis()
      .ping()
      .then((p) => p === 'PONG')
      .catch(() => false),
    prisma.delivery.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.excelImport.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, fileName: true, status: true, processedRows: true, createdAt: true },
    }),
    prisma.callAssignment.groupBy({
      by: ['operatorUserId'],
      where: { deletedAt: null, completedAt: null, status: 'PENDING' },
      _count: { _all: true },
    }),
    prisma.delivery.count({
      where: { deletedAt: null, status: { in: [...PREP_STATUSES] } },
    }),
    prisma
      .$queryRaw<[{ size: string }]>`SELECT pg_size_pretty(pg_database_size(current_database())) as size`
      .catch(() => [{ size: 'unknown' }]),
  ]);

  const prepLibre =
    deliveryByStatus.find((r) => r.status === 'LIBRE')?._count._all ?? 0;

  return {
    status: dbPing && redisPing ? 'healthy' : 'degraded',
    database: {
      connected: Boolean(dbPing),
      size: dbSize[0]?.size ?? 'unknown',
      patientCount,
      pendingPrepTotal: pendingCalls,
      pendingLibre: prepLibre,
      deliveriesByStatus: deliveryByStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
    },
    redis: { connected: redisPing },
    operations: {
      operatorsWithPendingCalls: activeOperators.length,
      totalPendingCallAssignments: activeOperators.reduce((s, o) => s + o._count._all, 0),
      lastExcelImport: lastImport,
    },
    backup: {
      recommendation:
        'Ejecute backup diario: npm run backup:run (prod) o bash scripts/backup-db-local.sh (dev)',
      retentionDays: Number(process.env.BACKUP_RETENTION_DAYS || 14),
    },
    timestamp: new Date().toISOString(),
  };
}
