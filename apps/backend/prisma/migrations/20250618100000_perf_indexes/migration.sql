-- Índices compuestos para consultas frecuentes con miles de pendientes
CREATE INDEX IF NOT EXISTS "deliveries_status_deleted_at_idx" ON "deliveries"("status", "deleted_at");
CREATE INDEX IF NOT EXISTS "deliveries_status_deleted_at_priority_idx" ON "deliveries"("status", "deleted_at", "priority");
CREATE INDEX IF NOT EXISTS "call_assignments_operator_active_idx" ON "call_assignments"("operator_user_id", "status", "deleted_at");
