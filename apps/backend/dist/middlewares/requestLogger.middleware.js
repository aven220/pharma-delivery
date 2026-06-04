"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const crypto_1 = require("crypto");
const logger_1 = require("../config/logger");
function requestLogger(req, res, next) {
    const requestId = (0, crypto_1.randomUUID)();
    req.requestId = requestId;
    const start = Date.now();
    res.on('finish', () => {
        if (req.path === '/live' || req.path === '/ready')
            return;
        logger_1.logger.info('HTTP request', {
            requestId,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            durationMs: Date.now() - start,
            ip: req.ip,
        });
    });
    next();
}
