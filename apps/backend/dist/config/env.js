"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProd = exports.isDev = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(4000),
    INSTANCE_ID: zod_1.z.string().default('backend-1'),
    DATABASE_URL: zod_1.z.string(),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_ACCESS_EXPIRES: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES: zod_1.z.string().default('7d'),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    UPLOAD_DIR: zod_1.z.string().default('./uploads'),
    MAX_FILE_SIZE: zod_1.z.coerce.number().default(10485760),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(900000),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().default(100),
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    LOG_DIR: zod_1.z.string().optional(),
    APP_PUBLIC_URL: zod_1.z.string().url().optional(),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().optional(),
    EXPO_ACCESS_TOKEN: zod_1.z.string().optional(),
    BACKUP_RETENTION_DAYS: zod_1.z.coerce.number().default(14),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
exports.isDev = exports.env.NODE_ENV === 'development';
exports.isProd = exports.env.NODE_ENV === 'production';
