-- Estados de preparación de pendientes: libre → empacado → llamadas
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'LIBRE';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'EMPACADO';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'RECHAZADO';
