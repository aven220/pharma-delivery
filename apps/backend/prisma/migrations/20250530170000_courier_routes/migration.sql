CREATE TYPE "CourierRouteStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PENDING_NEXT_DAY', 'CLOSED');

CREATE TABLE "courier_routes" (
    "id" TEXT NOT NULL,
    "courier_id" TEXT NOT NULL,
    "route_date" DATE NOT NULL,
    "status" "CourierRouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "total_stops" INTEGER NOT NULL DEFAULT 0,
    "completed_stops" INTEGER NOT NULL DEFAULT 0,
    "pending_stops" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "carried_from_id" TEXT,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_routes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "courier_routes_courier_id_route_date_key" ON "courier_routes"("courier_id", "route_date");
CREATE INDEX "courier_routes_courier_id_idx" ON "courier_routes"("courier_id");
CREATE INDEX "courier_routes_route_date_idx" ON "courier_routes"("route_date");
CREATE INDEX "courier_routes_status_idx" ON "courier_routes"("status");

ALTER TABLE "courier_routes" ADD CONSTRAINT "courier_routes_courier_id_fkey"
  FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_routes" ADD CONSTRAINT "courier_routes_carried_from_id_fkey"
  FOREIGN KEY ("carried_from_id") REFERENCES "courier_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "assignments" ADD COLUMN "route_id" TEXT;
CREATE INDEX "assignments_route_id_idx" ON "assignments"("route_id");
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_route_id_fkey"
  FOREIGN KEY ("route_id") REFERENCES "courier_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
