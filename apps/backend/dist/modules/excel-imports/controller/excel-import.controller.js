"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.excelImportController = exports.ExcelImportController = exports.excelUploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const excel_import_service_1 = require("../service/excel-import.service");
const fileStorage_1 = require("../../../infra/storage/fileStorage");
const env_1 = require("../../../config/env");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: env_1.env.MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];
        if (allowed.includes(file.mimetype) || file.originalname.match(/\.xlsx?$/i)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only Excel files are allowed'));
        }
    },
});
exports.excelUploadMiddleware = upload.single('file');
class ExcelImportController {
    async upload(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, error: 'File is required' });
                return;
            }
            const filePath = await (0, fileStorage_1.saveExcelFile)(req.file.buffer, req.file.originalname);
            const importRecord = await excel_import_service_1.excelImportService.createImport(req.user.sub, req.file.originalname, filePath);
            excel_import_service_1.excelImportService.processImport(importRecord.id).catch((err) => {
                console.error('Excel import failed:', err);
            });
            res.status(202).json({
                success: true,
                data: importRecord,
                message: 'Import queued for processing',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async list(req, res, next) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const result = await excel_import_service_1.excelImportService.listImports(page, limit);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const record = await excel_import_service_1.excelImportService.getImport(req.params.id);
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const result = await excel_import_service_1.excelImportService.deleteImport(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async reprocess(req, res, next) {
        try {
            const record = await excel_import_service_1.excelImportService.reprocessImport(req.params.id);
            res.status(202).json({ success: true, data: record, message: 'Reprocessing started' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ExcelImportController = ExcelImportController;
exports.excelImportController = new ExcelImportController();
