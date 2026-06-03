import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('error', (err) => logger.error('Redis error', { err: err.message }));
    redis.on('connect', () => logger.info('Redis connected'));
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await getRedis().get(key);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  await getRedis().del(key);
}
