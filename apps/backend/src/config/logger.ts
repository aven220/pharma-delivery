import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { env, isDev } from './env';

const logDir = env.LOG_DIR || path.join(process.cwd(), 'logs');

if (!isDev) {
  fs.mkdirSync(logDir, { recursive: true });
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    level: env.LOG_LEVEL,
    format: isDev
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
      : jsonFormat,
  }),
];

if (!isDev) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      level: env.LOG_LEVEL,
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    })
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: jsonFormat,
  defaultMeta: { service: 'a-as-delivery-api', instance: env.INSTANCE_ID },
  transports,
});
