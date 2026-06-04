"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXCEL_IMPORT_STATUS_LABELS = exports.ASSIGNMENT_STATUS_LABELS = exports.INCIDENT_LABELS = exports.COURIER_ROUTE_STATUS_LABELS = exports.INTERMUNICIPAL_ROUTE_STATUS_LABELS = exports.CALL_MANAGEMENT_RESULT_LABELS = exports.CALL_QUEUE_STATUS_LABELS = exports.PRIORITY_LABELS = exports.DELIVERY_STATUS_LABELS = void 0;
exports.label = label;
exports.DELIVERY_STATUS_LABELS = {
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
exports.PRIORITY_LABELS = {
    URGENT: 'Urgente',
    HIGH: 'Alta',
    MEDIUM: 'Media',
    LOW: 'Baja',
};
exports.CALL_QUEUE_STATUS_LABELS = {
    PENDING: 'Pendiente',
    CALLED: 'Llamado',
    ANSWERED: 'Contestó',
    NO_ANSWER: 'No contestó',
    OFF: 'Apagado',
    WRONG_NUMBER: 'Número incorrecto',
    RESCHEDULE: 'Reagendar',
    CONFIRMED: 'Confirmado',
};
exports.CALL_MANAGEMENT_RESULT_LABELS = {
    CONFIRMED_FOR_DELIVERY: 'Confirmado para entrega',
    REQUIRES_UPDATE: 'Requiere actualización',
    RESCHEDULE: 'Reagendar',
    WRONG_NUMBER: 'Número incorrecto',
    NOT_LOCATED: 'No localizado',
    SERVICE_REJECTED: 'Servicio rechazado',
};
exports.INTERMUNICIPAL_ROUTE_STATUS_LABELS = {
    PREPARATION: 'Preparación',
    READY_FOR_DISPATCH: 'Lista despacho',
    DISPATCHED: 'Despachada',
    IN_ROUTE: 'En ruta',
    COMPLETED: 'Finalizada',
    CANCELLED: 'Cancelada',
};
exports.COURIER_ROUTE_STATUS_LABELS = {
    ACTIVE: 'Activa',
    COMPLETED: 'Completada',
    PENDING_NEXT_DAY: 'Pendiente próximo día',
    CLOSED: 'Cerrada',
};
exports.INCIDENT_LABELS = {
    WRONG_ADDRESS: 'Dirección incorrecta',
    PATIENT_ABSENT: 'Paciente ausente',
    MEDICATION_REJECTED: 'Rechazo del medicamento',
    PHONE_NO_ANSWER: 'Teléfono no responde',
    CLOSED_HOME: 'Domicilio cerrado',
    DANGEROUS_ZONE: 'Zona insegura',
    INCOMPLETE_ORDER: 'Pedido incompleto',
    OTHER: 'Otro',
};
exports.ASSIGNMENT_STATUS_LABELS = {
    PENDING: 'Pendiente',
    ACCEPTED: 'Aceptada',
    IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
};
exports.EXCEL_IMPORT_STATUS_LABELS = {
    PENDING: 'Pendiente',
    PROCESSING: 'Procesando',
    COMPLETED: 'Completada',
    FAILED: 'Fallida',
};
function label(map, key) {
    if (!key)
        return '';
    return map[key] || key;
}
