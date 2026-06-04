import { Response, NextFunction } from 'express';
import multer from 'multer';
import { AuthRequest, routeParam } from '../../../middlewares/auth.middleware';
import { excelImportService } from '../service/excel-import.service';
import { saveExcelFile } from '../../../infra/storage/fileStorage';
import { env } from '../../../config/env';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.xlsx?$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

export const excelUploadMiddleware = upload.single('file');

export class ExcelImportController {
  async upload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'File is required' });
        return;
      }

      const filePath = await saveExcelFile(req.file.buffer, req.file.originalname);
      const importRecord = await excelImportService.createImport(
        req.user!.sub,
        req.file.originalname,
        filePath
      );

      excelImportService.processImport(importRecord.id).catch((err) => {
        console.error('Excel import failed:', err);
      });

      res.status(202).json({
        success: true,
        data: importRecord,
        message: 'Import queued for processing',
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await excelImportService.listImports(page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const record = await excelImportService.getImport(routeParam(req.params.id));
      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await excelImportService.deleteImport(routeParam(req.params.id));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async reprocess(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const record = await excelImportService.reprocessImport(routeParam(req.params.id));
      res.status(202).json({ success: true, data: record, message: 'Reprocessing started' });
    } catch (error) {
      next(error);
    }
  }
}

export const excelImportController = new ExcelImportController();
