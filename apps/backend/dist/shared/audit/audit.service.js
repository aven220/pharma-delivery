"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
const prisma_1 = require("../../infra/database/prisma");
const logger_1 = require("../../config/logger");
async function writeAuditLog(input) {
    try {
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: input.userId,
                action: input.action,
                entity: input.entity,
                entityId: input.entityId,
                oldData: input.oldData,
                newData: input.newData,
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
            },
        });
    }
    catch (err) {
        logger_1.logger.error('Audit log write failed', {
            action: input.action,
            entity: input.entity,
            err: err instanceof Error ? err.message : String(err),
        });
    }
}
