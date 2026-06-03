"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHash = generateHash;
exports.generateDeliveryNumber = generateDeliveryNumber;
exports.paginate = paginate;
exports.buildPaginationMeta = buildPaginationMeta;
exports.sanitizePhone = sanitizePhone;
exports.isValidCoordinates = isValidCoordinates;
exports.sleep = sleep;
exports.chunkArray = chunkArray;
const crypto_js_1 = __importDefault(require("crypto-js"));
function generateHash(...parts) {
    const normalized = parts
        .filter((p) => p !== null && p !== undefined)
        .map((p) => String(p).trim().toUpperCase())
        .join('|');
    return crypto_js_1.default.SHA256(normalized).toString(crypto_js_1.default.enc.Hex);
}
function generateDeliveryNumber(prefix = 'DLV') {
    const date = new Date();
    const y = date.getFullYear().toString().slice(-2);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${y}${m}${d}${rand}`;
}
function paginate(page, limit) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    return {
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        page: safePage,
        limit: safeLimit,
    };
}
function buildPaginationMeta(total, page, limit) {
    return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
    };
}
function sanitizePhone(phone) {
    return phone.replace(/\D/g, '');
}
function isValidCoordinates(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
