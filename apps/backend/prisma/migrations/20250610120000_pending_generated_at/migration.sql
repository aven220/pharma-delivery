-- Fecha de generación del pendiente (distinta de fecha programada de entrega)
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "pending_generated_at" TIMESTAMP(3);
