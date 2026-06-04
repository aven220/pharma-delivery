"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const AppError_1 = require("../shared/errors/AppError");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError_1.AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            code: err.code,
        });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.flatten().fieldErrors,
        });
        return;
    }
    logger_1.logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({
        success: false,
        error: env_1.isDev ? err.message : 'Internal server error',
    });
}
