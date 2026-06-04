"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUploadDir = ensureUploadDir;
exports.saveEvidenceFile = saveEvidenceFile;
exports.saveExcelFile = saveExcelFile;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const env_1 = require("../../config/env");
const logger_1 = require("../../config/logger");
async function ensureUploadDir() {
    await promises_1.default.mkdir(env_1.env.UPLOAD_DIR, { recursive: true });
    await promises_1.default.mkdir(path_1.default.join(env_1.env.UPLOAD_DIR, 'evidence'), { recursive: true });
    await promises_1.default.mkdir(path_1.default.join(env_1.env.UPLOAD_DIR, 'excel'), { recursive: true });
}
async function saveEvidenceFile(buffer, fileName) {
    const ext = path_1.default.extname(fileName).toLowerCase() || '.jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const relativePath = path_1.default.join('evidence', uniqueName);
    const fullPath = path_1.default.join(env_1.env.UPLOAD_DIR, relativePath);
    let output = buffer;
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        output = await (0, sharp_1.default)(buffer)
            .rotate()
            .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
    }
    await promises_1.default.writeFile(fullPath, output);
    logger_1.logger.debug('Evidence saved', { relativePath });
    return {
        filePath: relativePath,
        mimeType: ext === '.png' ? 'image/png' : 'image/jpeg',
        fileSize: output.length,
    };
}
async function saveExcelFile(buffer, fileName) {
    const uniqueName = `${Date.now()}-${fileName}`;
    const relativePath = path_1.default.join('excel', uniqueName);
    const fullPath = path_1.default.join(env_1.env.UPLOAD_DIR, relativePath);
    await promises_1.default.writeFile(fullPath, buffer);
    return relativePath;
}
