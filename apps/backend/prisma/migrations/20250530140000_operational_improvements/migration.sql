-- CreateEnum
CREATE TYPE "CallQueueStatus" AS ENUM ('PENDING', 'CALLED', 'ANSWERED', 'NO_ANSWER', 'OFF', 'WRONG_NUMBER', 'RESCHEDULE', 'CONFIRMED');
CREATE TYPE "CallManagementResult" AS ENUM ('CONFIRMED_FOR_DELIVERY', 'REQUIRES_UPDATE', 'RESCHEDULE', 'NOT_LOCATED', 'WRONG_NUMBER', 'SERVICE_REJECTED');
CREATE TYPE "MedicationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
ALTER TYPE "CallResult" ADD VALUE 'CONFIRMED';

-- AlterTable patients
ALTER TABLE "patients" ADD COLUMN "phone_family" TEXT;
ALTER TABLE "patients" ADD COLUMN "phone_alternative" TEXT;

-- AlterTable couriers
ALTER TABLE "couriers" ADD COLUMN "zone" TEXT;
ALTER TABLE "couriers" ADD COLUMN "last_connected_at" TIMESTAMP(3);

-- AlterTable medications
ALTER TABLE "medications" ADD COLUMN "cum" TEXT;
ALTER TABLE "medications" ADD COLUMN "laboratory" TEXT;
ALTER TABLE "medications" ADD COLUMN "presentation" TEXT;
ALTER TABLE "medications" ADD COLUMN "concentration" TEXT;
ALTER TABLE "medications" ADD COLUMN "status" "MedicationStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE UNIQUE INDEX "medications_cum_key" ON "medications"("cum");
CREATE INDEX "medications_cum_idx" ON "medications"("cum");
CREATE INDEX "medications_status_idx" ON "medications"("status");

-- CreateTable call_assignments
CREATE TABLE "call_assignments" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "operator_user_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "status" "CallQueueStatus" NOT NULL DEFAULT 'PENDING',
    "management_result" "CallManagementResult",
    "observations" TEXT,
    "call_date" TIMESTAMP(3),
    "call_time" TEXT,
    "duration_sec" INTEGER,
    "phone_used" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "call_assignments_delivery_id_idx" ON "call_assignments"("delivery_id");
CREATE INDEX "call_assignments_operator_user_id_idx" ON "call_assignments"("operator_user_id");
CREATE INDEX "call_assignments_status_idx" ON "call_assignments"("status");
CREATE INDEX "call_assignments_assigned_at_idx" ON "call_assignments"("assigned_at");

ALTER TABLE "call_assignments" ADD CONSTRAINT "call_assignments_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "call_assignments" ADD CONSTRAINT "call_assignments_operator_user_id_fkey" FOREIGN KEY ("operator_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "call_assignments" ADD CONSTRAINT "call_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable patient_change_logs
CREATE TABLE "patient_change_logs" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_change_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "patient_change_logs_patient_id_idx" ON "patient_change_logs"("patient_id");
CREATE INDEX "patient_change_logs_changed_by_id_idx" ON "patient_change_logs"("changed_by_id");
CREATE INDEX "patient_change_logs_created_at_idx" ON "patient_change_logs"("created_at");

ALTER TABLE "patient_change_logs" ADD CONSTRAINT "patient_change_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_change_logs" ADD CONSTRAINT "patient_change_logs_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
