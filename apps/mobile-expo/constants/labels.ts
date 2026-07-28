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

export const INCIDENT_LABELS: Record<string, string> = {
  WRONG_ADDRESS: 'Dirección incorrecta',
  PATIENT_ABSENT: 'Paciente ausente',
  MEDICATION_REJECTED: 'Rechazo del medicamento',
  PHONE_NO_ANSWER: 'Teléfono no responde',
  CLOSED_HOME: 'Domicilio cerrado',
  DANGEROUS_ZONE: 'Zona insegura',
  OTHER: 'Otro',
};

export const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptado',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  REASSIGNED: 'Reasignado',
  CANCELLED: 'Cancelado',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operador',
  DOMICILIARIO: 'Domiciliario',
  COURIER: 'Domiciliario',
  AUDITOR: 'Auditor',
  DRIVER: 'Conductor',
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

export const CALL_MANAGEMENT_LABELS: Record<string, string> = {
  CONFIRMED_FOR_DELIVERY: 'Confirmado para entrega',
  REQUIRES_UPDATE: 'Requiere actualización',
  RESCHEDULE: 'Reagendar',
  NOT_LOCATED: 'No localizado',
  WRONG_NUMBER: 'Número equivocado',
  SERVICE_REJECTED: 'Rechaza servicio',
};

export const ROUTE_STATUS_LABELS: Record<string, string> = {
  PREPARATION: 'Preparación',
  READY_FOR_DISPATCH: 'Lista para despacho',
  DISPATCHED: 'Despachada',
  IN_ROUTE: 'En ruta',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
  ACTIVE: 'Activa',
  CLOSED: 'Cerrada',
};

export { BrandConfig } from '@pharma/types';
