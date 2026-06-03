-- Paso 2: usar nuevos valores de enum (requiere migración anterior ya aplicada)

UPDATE "deliveries" SET "status" = 'PENDING_CALL' WHERE "status" = 'PENDING';

ALTER TABLE "deliveries" ALTER COLUMN "status" SET DEFAULT 'PENDING_CALL';
