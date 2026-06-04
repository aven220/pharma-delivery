import { Router, Response, NextFunction } from 'express';
import { AuthRequest, routeParam } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import { REPORT_TYPES, reportsService } from '../service/reports.service';

const router = Router();

router.get('/types', requirePermission('reports.export', 'dashboard.read'), (_req, res) => {
  res.json({ success: true, data: REPORT_TYPES });
});

router.get('/:type', requirePermission('reports.export', 'dashboard.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const type = routeParam(req.params.type) as (typeof REPORT_TYPES)[number];
    if (!REPORT_TYPES.includes(type)) {
      res.status(400).json({ success: false, message: 'Tipo de reporte no válido' });
      return;
    }

    const format = ['csv', 'html', 'pdf'].includes(req.query.format as string)
      ? (req.query.format as string)
      : 'xlsx';
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const result = await reportsService.generate(type, format as 'csv' | 'xlsx' | 'html' | 'pdf', {
      dateFrom,
      dateTo,
      status: req.query.status as string,
      operatorId: req.query.operatorId as string,
      courierId: req.query.courierId as string,
      municipalityId: req.query.municipalityId as string,
      routeId: req.query.routeId as string,
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
