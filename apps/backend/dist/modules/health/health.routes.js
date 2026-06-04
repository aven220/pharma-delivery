"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_service_1 = require("./health.service");
const router = (0, express_1.Router)();
router.get('/live', (_req, res) => {
    res.json((0, health_service_1.checkLive)());
});
router.get('/ready', async (_req, res) => {
    const result = await (0, health_service_1.checkReady)();
    res.status(result.status === 'ready' ? 200 : 503).json(result);
});
router.get('/health', async (_req, res) => {
    const result = await (0, health_service_1.checkHealth)();
    res.status(result.status === 'ok' ? 200 : 503).json(result);
});
router.get('/metrics', (_req, res) => {
    const mem = process.memoryUsage();
    res.type('text/plain').send([
        '# HELP process_uptime_seconds Uptime del proceso',
        '# TYPE process_uptime_seconds gauge',
        `process_uptime_seconds ${Math.floor(process.uptime())}`,
        '# HELP process_resident_memory_bytes Memoria RSS',
        '# TYPE process_resident_memory_bytes gauge',
        `process_resident_memory_bytes ${mem.rss}`,
    ].join('\n'));
});
exports.default = router;
