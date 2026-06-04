import { Router, Request, Response } from 'express';
import { checkHealth, checkLive, checkReady } from './health.service';

const router = Router();

router.get('/live', (_req: Request, res: Response) => {
  res.json(checkLive());
});

router.get('/ready', async (_req: Request, res: Response) => {
  const result = await checkReady();
  res.status(result.status === 'ready' ? 200 : 503).json(result);
});

router.get('/health', async (_req: Request, res: Response) => {
  const result = await checkHealth();
  res.status(result.status === 'ok' ? 200 : 503).json(result);
});

router.get('/metrics', (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  res.type('text/plain').send(
    [
      '# HELP process_uptime_seconds Uptime del proceso',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${Math.floor(process.uptime())}`,
      '# HELP process_resident_memory_bytes Memoria RSS',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${mem.rss}`,
    ].join('\n')
  );
});

export default router;
