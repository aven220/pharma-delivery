-- Paso 1: ampliar enums (debe commitearse antes de usar los nuevos valores)

ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'PENDING_CALL';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'CALL_COMPLETED';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED_FOR_DELIVERY';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_DELIVERED';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'NOT_DELIVERED';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

CREATE TYPE "DeactivationReason" AS ENUM (
  'PATIENT_DECEASED', 'WRONG_ADDRESS', 'WRONG_NUMBER', 'TREATMENT_REJECTED',
  'MEDICATION_SUSPENDED', 'EPS_CANCELLED', 'DUPLICATE', 'LOAD_ERROR', 'NOT_LOCATED', 'OTHER'
);

CREATE TYPE "PendingSubreason" AS ENUM (
  'NO_ANSWER', 'PHONE_OFF', 'RESCHEDULE_CALL', 'PENDING_AUTHORIZATION',
  'PENDING_VALIDATION', 'PENDING_ADDRESS', 'OTHER'
);

ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'PHONE_NO_ANSWER';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'CLOSED_HOME';

CREATE TABLE "delivery_status_logs" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "from_status" "DeliveryStatus",
    "to_status" "DeliveryStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "deactivation_reason" "DeactivationReason",
    "pending_subreason" "PendingSubreason",
    "observations" TEXT,
    "changed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_status_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_status_logs_delivery_id_idx" ON "delivery_status_logs"("delivery_id");
CREATE INDEX "delivery_status_logs_changed_by_id_idx" ON "delivery_status_logs"("changed_by_id");
CREATE INDEX "delivery_status_logs_created_at_idx" ON "delivery_status_logs"("created_at");

ALTER TABLE "delivery_status_logs" ADD CONSTRAINT "delivery_status_logs_delivery_id_fkey"
  FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_status_logs" ADD CONSTRAINT "delivery_status_logs_changed_by_id_fkey"
  FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
