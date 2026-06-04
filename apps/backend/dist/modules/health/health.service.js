"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLive = checkLive;
exports.checkReady = checkReady;
exports.checkHealth = checkHealth;
const prisma_1 = require("../../infra/database/prisma");
const client_1 = require("../../infra/redis/client");
const env_1 = require("../../config/env");
async function checkLive() {
    return {
        status: 'alive',
        service: 'a-as-delivery-api',
        instance: env_1.env.INSTANCE_ID,
        timestamp: new Date().toISOString(),
        uptimeSec: Math.floor(process.uptime()),
    };
}
async function checkReady() {
    const checks = {
        database: 'fail',
        redis: 'fail',
    };
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        checks.database = 'ok';
    }
    catch {
        checks.database = 'fail';
    }
    try {
        const pong = await (0, client_1.getRedis)().ping();
        checks.redis = pong === 'PONG' ? 'ok' : 'fail';
    }
    catch {
        checks.redis = 'fail';
    }
    const ready = checks.database === 'ok' && checks.redis === 'ok';
    return {
        status: ready ? 'ready' : 'not_ready',
        checks,
        instance: env_1.env.INSTANCE_ID,
        timestamp: new Date().toISOString(),
    };
}
async function checkHealth() {
    const ready = await checkReady();
    return {
        ...ready,
        status: ready.status === 'ready' ? 'ok' : 'degraded',
    };
}
