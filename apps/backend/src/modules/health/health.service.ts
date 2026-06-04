import { prisma } from '../../infra/database/prisma';
import { getRedis } from '../../infra/redis/client';
import { env } from '../../config/env';

export async function checkLive() {
  return {
    status: 'alive',
    service: 'a-as-delivery-api',
    instance: env.INSTANCE_ID,
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor(process.uptime()),
  };
}

export async function checkReady() {
  const checks: Record<string, 'ok' | 'fail'> = {
    database: 'fail',
    redis: 'fail',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'fail';
  }

  try {
    const pong = await getRedis().ping();
    checks.redis = pong === 'PONG' ? 'ok' : 'fail';
  } catch {
    checks.redis = 'fail';
  }

  const ready = checks.database === 'ok' && checks.redis === 'ok';

  return {
    status: ready ? 'ready' : 'not_ready',
    checks,
    instance: env.INSTANCE_ID,
    timestamp: new Date().toISOString(),
  };
}

export async function checkHealth() {
  const ready = await checkReady();
  return {
    ...ready,
    status: ready.status === 'ready' ? 'ok' : 'degraded',
  };
}
