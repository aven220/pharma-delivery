"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("./env");
const logDir = env_1.env.LOG_DIR || path_1.default.join(process.cwd(), 'logs');
if (!env_1.isDev) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
const jsonFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const transports = [
    new winston_1.default.transports.Console({
        level: env_1.env.LOG_LEVEL,
        format: env_1.isDev
            ? winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
            }))
            : jsonFormat,
    }),
];
if (!env_1.isDev) {
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'app.log'),
        level: env_1.env.LOG_LEVEL,
        format: jsonFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
    }), new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'error.log'),
        level: 'error',
        format: jsonFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
    }));
}
exports.logger = winston_1.default.createLogger({
    level: env_1.env.LOG_LEVEL,
    format: jsonFormat,
    defaultMeta: { service: 'a-as-delivery-api', instance: env_1.env.INSTANCE_ID },
    transports,
});
