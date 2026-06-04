"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
exports.requirePermission = requirePermission;
const AppError_1 = require("../shared/errors/AppError");
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new AppError_1.ForbiddenError());
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new AppError_1.ForbiddenError('Insufficient role'));
            return;
        }
        next();
    };
}
function requirePermission(...permissions) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new AppError_1.ForbiddenError());
            return;
        }
        if (req.user.role === 'ADMIN') {
            next();
            return;
        }
        const hasPermission = permissions.some((p) => req.user.permissions.includes(p));
        if (!hasPermission) {
            next(new AppError_1.ForbiddenError('Insufficient permissions'));
            return;
        }
        next();
    };
}
