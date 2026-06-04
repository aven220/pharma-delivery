"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeParam = routeParam;
exports.authMiddleware = authMiddleware;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const AppError_1 = require("../shared/errors/AppError");
/** Normaliza parámetros de ruta Express (string | string[] → string). */
function routeParam(value) {
    if (value == null)
        return '';
    return Array.isArray(value) ? value[0] : value;
}
function authMiddleware(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        next(new AppError_1.UnauthorizedError('No token provided'));
        return;
    }
    const token = header.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
        req.user = payload;
        next();
    }
    catch {
        next(new AppError_1.UnauthorizedError('Invalid or expired token'));
    }
}
function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        next();
        return;
    }
    try {
        req.user = jsonwebtoken_1.default.verify(header.slice(7), env_1.env.JWT_ACCESS_SECRET);
    }
    catch {
        // ignore
    }
    next();
}
