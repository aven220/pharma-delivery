import { Router } from 'express';
import { excelImportController, excelUploadMiddleware } from '../controller/excel-import.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

router.post(
  '/upload',
  requirePermission('excel.import'),
  excelUploadMiddleware,
  excelImportController.upload.bind(excelImportController)
);

router.get(
  '/template',
  requirePermission('excel.import', 'excel.read'),
  excelImportController.downloadTemplate.bind(excelImportController)
);

router.get(
  '/',
  requirePermission('excel.read', 'excel.import'),
  excelImportController.list.bind(excelImportController)
);

router.get(
  '/:id',
  requirePermission('excel.read', 'excel.import'),
  excelImportController.getById.bind(excelImportController)
);

router.delete(
  '/:id',
  requirePermission('excel.delete'),
  excelImportController.delete.bind(excelImportController)
);

router.post(
  '/:id/reprocess',
  requirePermission('excel.reprocess'),
  excelImportController.reprocess.bind(excelImportController)
);

export default router;
