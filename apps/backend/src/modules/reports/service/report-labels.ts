export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING_CALL: 'Pendiente llamada',
  CALL_COMPLETED: 'Llamada realizada',
  CONFIRMED_FOR_DELIVERY: 'Confirmado para entrega',
  ASSIGNED: 'Asignado',
  IN_ROUTE: 'En ruta',
  DELIVERED: 'Entregado',
  PARTIALLY_DELIVERED: 'Entregado parcial',
  NOT_DELIVERED: 'No entregado',
  CANCELLED: 'Cancelado',
  RETURNED: 'Devuelto',
  PENDING: 'Pendiente',
  SCHEDULED: 'Programado',
  FAILED: 'Fallido',
  RESCHEDULED: 'Reagendado',
};

export const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

export const CALL_QUEUE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CALLED: 'Llamado',
  ANSWERED: 'Contestó',
  NO_ANSWER: 'No contestó',
  OFF: 'Apagado',
  WRONG_NUMBER: 'Número incorrecto',
  RESCHEDULE: 'Reagendar',
  CONFIRMED: 'Confirmado',
};

export const CALL_MANAGEMENT_RESULT_LABELS: Record<string, string> = {
  CONFIRMED_FOR_DELIVERY: 'Confirmado para entrega',
  REQUIRES_UPDATE: 'Requiere actualización',
  RESCHEDULE: 'Reagendar',
  WRONG_NUMBER: 'Número incorrecto',
  NOT_LOCATED: 'No localizado',
  SERVICE_REJECTED: 'Servicio rechazado',
};

export const INTERMUNICIPAL_ROUTE_STATUS_LABELS: Record<string, string> = {
  PREPARATION: 'Preparación',
  READY_FOR_DISPATCH: 'Lista despacho',
  DISPATCHED: 'Despachada',
  IN_ROUTE: 'En ruta',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

export const COURIER_ROUTE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  COMPLETED: 'Completada',
  PENDING_NEXT_DAY: 'Pendiente próximo día',
  CLOSED: 'Cerrada',
};

export const INCIDENT_LABELS: Record<string, string> = {
  WRONG_ADDRESS: 'Dirección incorrecta',
  PATIENT_ABSENT: 'Paciente ausente',
  MEDICATION_REJECTED: 'Rechazo del medicamento',
  PHONE_NO_ANSWER: 'Teléfono no responde',
  CLOSED_HOME: 'Domicilio cerrado',
  DANGEROUS_ZONE: 'Zona insegura',
  INCOMPLETE_ORDER: 'Pedido incompleto',
  OTHER: 'Otro',
};

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export const EXCEL_IMPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completada',
  FAILED: 'Fallida',
};

export function label(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return '';
  return map[key] || key;
}
