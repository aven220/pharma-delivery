"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedis = getRedis;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../../config/env");
const logger_1 = require("../../config/logger");
let redis = null;
function getRedis() {
    if (!redis) {
        redis = new ioredis_1.default(env_1.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
        redis.on('error', (err) => logger_1.logger.error('Redis error', { err: err.message }));
        redis.on('connect', () => logger_1.logger.info('Redis connected'));
    }
    return redis;
}
async function connectRedis() {
    const client = getRedis();
    await client.connect();
}
async function disconnectRedis() {
    if (redis) {
        await redis.quit();
        redis = null;
    }
}
async function cacheGet(key) {
    const data = await getRedis().get(key);
    return data ? JSON.parse(data) : null;
}
async function cacheSet(key, value, ttlSeconds = 300) {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
}
async function cacheDel(key) {
    await getRedis().del(key);
}
