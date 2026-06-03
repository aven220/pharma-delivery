-- CreateEnum
CREATE TYPE "OperationalType" AS ENUM ('DOMICILIARIO', 'CONDUCTOR_RUTA');

-- CreateEnum
CREATE TYPE "IntermunicipalRouteStatus" AS ENUM ('PREPARATION', 'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_ROUTE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntermunicipalRouteHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'DISPATCHED', 'CLOSED', 'CANCELLED', 'DRIVER_CHANGED', 'TRANSFERRED', 'SPLIT', 'DELIVERY_ADDED', 'DELIVERY_REMOVED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "operational_type" "OperationalType" NOT NULL DEFAULT 'DOMICILIARIO';

-- CreateIndex
CREATE INDEX "users_operational_type_idx" ON "users"("operational_type");

-- CreateTable
CREATE TABLE "route_municipalities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intermunicipal_routes" (
    "id" TEXT NOT NULL,
    "route_code" TEXT NOT NULL,
    "route_date" DATE NOT NULL,
    "driver_id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "observations" TEXT,
    "status" "IntermunicipalRouteStatus" NOT NULL DEFAULT 'PREPARATION',
    "dispatched_at" TIMESTAMP(3),
    "dispatched_by_id" TEXT,
    "closed_at" TIMESTAMP(3),
    "parent_route_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intermunicipal_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intermunicipal_route_deliveries" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "stop_order" INTEGER NOT NULL DEFAULT 0,
    "added_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intermunicipal_route_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intermunicipal_route_history" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "action" "IntermunicipalRouteHistoryAction" NOT NULL,
    "from_status" "IntermunicipalRouteStatus",
    "to_status" "IntermunicipalRouteStatus",
    "from_driver_id" TEXT,
    "to_driver_id" TEXT,
    "metadata" JSONB,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intermunicipal_route_history_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN "municipality_id" TEXT;

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN "intermunicipal_route_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "route_municipalities_name_key" ON "route_municipalities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "route_municipalities_code_key" ON "route_municipalities"("code");

-- CreateIndex
CREATE INDEX "route_municipalities_is_active_idx" ON "route_municipalities"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "intermunicipal_routes_route_code_key" ON "intermunicipal_routes"("route_code");

-- CreateIndex
CREATE INDEX "intermunicipal_routes_driver_id_idx" ON "intermunicipal_routes"("driver_id");

-- CreateIndex
CREATE INDEX "intermunicipal_routes_municipality_id_idx" ON "intermunicipal_routes"("municipality_id");

-- CreateIndex
CREATE INDEX "intermunicipal_routes_route_date_idx" ON "intermunicipal_routes"("route_date");

-- CreateIndex
CREATE INDEX "intermunicipal_routes_status_idx" ON "intermunicipal_routes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "intermunicipal_route_deliveries_route_id_delivery_id_key" ON "intermunicipal_route_deliveries"("route_id", "delivery_id");

-- CreateIndex
CREATE INDEX "intermunicipal_route_deliveries_route_id_stop_order_idx" ON "intermunicipal_route_deliveries"("route_id", "stop_order");

-- CreateIndex
CREATE INDEX "intermunicipal_route_deliveries_delivery_id_idx" ON "intermunicipal_route_deliveries"("delivery_id");

-- CreateIndex
CREATE INDEX "intermunicipal_route_history_route_id_idx" ON "intermunicipal_route_history"("route_id");

-- CreateIndex
CREATE INDEX "intermunicipal_route_history_created_at_idx" ON "intermunicipal_route_history"("created_at");

-- CreateIndex
CREATE INDEX "deliveries_municipality_id_idx" ON "deliveries"("municipality_id");

-- CreateIndex
CREATE INDEX "assignments_intermunicipal_route_id_idx" ON "assignments"("intermunicipal_route_id");

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "route_municipalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_intermunicipal_route_id_fkey" FOREIGN KEY ("intermunicipal_route_id") REFERENCES "intermunicipal_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermunicipal_routes" ADD CONSTRAINT "intermunicipal_routes_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermunicipal_routes" ADD CONSTRAINT "intermunicipal_routes_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "route_municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermunicipal_routes" ADD CONSTRAINT "intermunicipal_routes_dispatched_by_id_fkey" FOREIGN KEY ("dispatched_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermunicipal_routes" ADD CONSTRAINT "intermunicipal_routes_parent_route_id_fkey" FOREIGN KEY ("parent_route_id") REFERENCES "intermunicipal_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermunicipal_route_deliveries" ADD CONSTRAINT "intermunicipal_route_deliveries_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "intermunicipal_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermunicipal_route_deliveries" ADD CONSTRAINT "intermunicipal_route_deliveries_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermunicipal_route_history" ADD CONSTRAINT "intermunicipal_route_history_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "intermunicipal_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermunicipal_route_history" ADD CONSTRAINT "intermunicipal_route_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
