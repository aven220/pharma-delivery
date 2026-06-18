export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  LIBRE: 'Libre',
  EMPACADO: 'Empacado',
  RECHAZADO: 'Rechazado',
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

export const CALL_RESULT_LABELS: Record<string, string> = {
  ANSWERED: 'Contestó',
  NO_ANSWER: 'No contestó',
  OFF: 'Apagado',
  WRONG_NUMBER: 'Número incorrecto',
  RESCHEDULE: 'Reagendar',
  CONFIRMED: 'Confirmado',
};

export const ROUTE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  COMPLETED: 'Completada',
  PENDING_NEXT_DAY: 'Pendiente próximo día',
  CLOSED: 'Cerrada',
  PREPARATION: 'Preparación',
  READY_FOR_DISPATCH: 'Lista para despacho',
  DISPATCHED: 'Despachada',
  IN_ROUTE: 'En ruta',
  CANCELLED: 'Cancelada',
};

export const CALL_CATEGORY_LABELS = {
  pending: 'Pendientes de llamar',
  in_management: 'En gestión',
  confirmed: 'Confirmados',
  rescheduled: 'Reagendados',
  deactivated: 'Dados de baja',
  delivered: 'Entregadas',
} as const;

export type CallCategoryId = keyof typeof CALL_CATEGORY_LABELS;

const TERMINAL_DELIVERY_STATUSES = ['DELIVERED', 'CANCELLED', 'RETURNED'] as const;

export function isDeliveryCallLocked(deliveryStatus?: string | null): boolean {
  return TERMINAL_DELIVERY_STATUSES.includes(
    (deliveryStatus || '') as (typeof TERMINAL_DELIVERY_STATUSES)[number]
  );
}

export function getDeliveryCallLockMessage(deliveryStatus?: string | null): string | null {
  if (deliveryStatus === 'DELIVERED') return 'Esta entrega ya fue completada.';
  if (deliveryStatus === 'CANCELLED') return 'Esta entrega fue cancelada o dada de baja.';
  if (deliveryStatus === 'RETURNED') return 'Esta entrega fue devuelta.';
  return null;
}

export function getCallCategory(call: {
  status: string;
  managementResult?: string | null;
  delivery?: { status?: string };
}): CallCategoryId {
  const { status, managementResult } = call;
  const deliveryStatus = call.delivery?.status;

  if (deliveryStatus === 'DELIVERED') return 'delivered';

  if (
    deliveryStatus === 'CANCELLED' ||
    deliveryStatus === 'RETURNED' ||
    managementResult === 'SERVICE_REJECTED' ||
    managementResult === 'WRONG_NUMBER' ||
    managementResult === 'NOT_LOCATED' ||
    status === 'WRONG_NUMBER'
  ) {
    return 'deactivated';
  }

  if (
    deliveryStatus === 'CONFIRMED_FOR_DELIVERY' ||
    deliveryStatus === 'ASSIGNED' ||
    deliveryStatus === 'IN_ROUTE'
  ) {
    return 'confirmed';
  }

  if (managementResult === 'CONFIRMED_FOR_DELIVERY' || status === 'CONFIRMED') {
    return 'confirmed';
  }

  if (
    managementResult === 'RESCHEDULE' ||
    status === 'RESCHEDULE' ||
    deliveryStatus === 'RESCHEDULED'
  ) {
    return 'rescheduled';
  }

  if (status === 'PENDING') return 'pending';
  if (['CALLED', 'NO_ANSWER', 'OFF', 'ANSWERED'].includes(status)) return 'in_management';
  return 'in_management';
}

export function translateLabel(map: Record<string, string>, key: string): string {
  return map[key] || key;
}

/** Nombre completo cuando Apellido es placeholder (importación masiva) */
export function formatPatientName(p: { firstName: string; lastName?: string | null }): string {
  const last = p.lastName?.trim();
  if (!last || last === '.' || last === '-') return p.firstName.trim();
  return `${p.firstName.trim()} ${last}`.trim();
}

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

export const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

export const DEACTIVATION_LABELS: Record<string, string> = {
  PATIENT_DECEASED: 'Paciente fallecido',
  WRONG_ADDRESS: 'Dirección incorrecta',
  WRONG_NUMBER: 'Número incorrecto',
  TREATMENT_REJECTED: 'Paciente rechaza tratamiento',
  MEDICATION_SUSPENDED: 'Medicamento suspendido',
  EPS_CANCELLED: 'EPS canceló servicio',
  DUPLICATE: 'Duplicado',
  LOAD_ERROR: 'Error de carga',
  NOT_LOCATED: 'No localizado',
  OTHER: 'Otro',
};

export const PENDING_SUBREASON_LABELS: Record<string, string> = {
  NO_ANSWER: 'No contestó',
  PHONE_OFF: 'Teléfono apagado',
  RESCHEDULE_CALL: 'Reagendar llamada',
  PENDING_AUTHORIZATION: 'Pendiente autorización',
  PENDING_VALIDATION: 'Pendiente validación',
  PENDING_ADDRESS: 'Pendiente dirección',
  OTHER: 'Otro',
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

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptado',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  REASSIGNED: 'Reasignado',
  CANCELLED: 'Cancelado',
};

export const CALL_MANAGEMENT_LABELS: Record<string, string> = {
  CONFIRMED_FOR_DELIVERY: 'Confirmado para entrega',
  REQUIRES_UPDATE: 'Requiere actualización',
  RESCHEDULE: 'Reagendar',
  NOT_LOCATED: 'No localizado',
  WRONG_NUMBER: 'Número equivocado',
  SERVICE_REJECTED: 'Rechaza servicio',
};

export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SUSPENDED: 'Suspendido',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operador',
  DOMICILIARIO: 'Domiciliario',
  COURIER: 'Domiciliario',
  AUDITOR: 'Auditor',
};

export const OPERATIONAL_TYPE_LABELS: Record<string, string> = {
  DOMICILIARIO: 'Domiciliario urbano',
  CONDUCTOR_RUTA: 'Conductor de ruta',
};

export const INTERMUNICIPAL_ROUTE_STATUS_LABELS: Record<string, string> = {
  PREPARATION: 'Preparación',
  READY_FOR_DISPATCH: 'Lista para despacho',
  DISPATCHED: 'Despachada',
  IN_ROUTE: 'En ruta',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

export { BrandConfig } from '@/config/brand';
