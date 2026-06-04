export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED"
}
export declare enum DeliveryStatus {
    PENDING = "PENDING",
    SCHEDULED = "SCHEDULED",
    ASSIGNED = "ASSIGNED",
    IN_ROUTE = "IN_ROUTE",
    DELIVERED = "DELIVERED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    RESCHEDULED = "RESCHEDULED"
}
export declare enum DeliveryPriority {
    URGENT = "URGENT",
    HIGH = "HIGH",
    MEDIUM = "MEDIUM",
    LOW = "LOW"
}
export declare enum AssignmentStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    REASSIGNED = "REASSIGNED",
    CANCELLED = "CANCELLED"
}
export declare enum CallResult {
    ANSWERED = "ANSWERED",
    NO_ANSWER = "NO_ANSWER",
    OFF = "OFF",
    WRONG_NUMBER = "WRONG_NUMBER",
    RESCHEDULE = "RESCHEDULE"
}
export declare enum IncidentType {
    WRONG_ADDRESS = "WRONG_ADDRESS",
    PATIENT_ABSENT = "PATIENT_ABSENT",
    MEDICATION_REJECTED = "MEDICATION_REJECTED",
    DANGEROUS_ZONE = "DANGEROUS_ZONE",
    INCOMPLETE_ORDER = "INCOMPLETE_ORDER",
    OTHER = "OTHER"
}
export declare enum EvidenceType {
    PHOTO = "PHOTO",
    SIGNATURE = "SIGNATURE",
    DOCUMENT = "DOCUMENT"
}
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    permissions: string[];
}
export interface UserDTO {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    role: {
        id: string;
        name: string;
    };
    operationalType?: 'DOMICILIARIO' | 'CONDUCTOR_RUTA';
    permissions: string[];
}
export interface DeliveryDTO {
    id: string;
    deliveryNumber: string;
    status: DeliveryStatus;
    priority: DeliveryPriority;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    patient: {
        id: string;
        firstName: string;
        lastName: string;
        phone?: string | null;
        address: string;
        documentId: string;
    };
    items: DeliveryItemDTO[];
    assignment?: AssignmentDTO | null;
    evidenceCount?: number;
    observations?: string | null;
    failureReason?: string | null;
}
export interface DeliveryItemDTO {
    id: string;
    quantity: number;
    lotNumber?: string | null;
    medication: {
        id: string;
        code: string;
        name: string;
    };
}
export interface AssignmentDTO {
    id: string;
    status: AssignmentStatus;
    routeOrder: number;
    courier: {
        id: string;
        firstName: string;
        lastName: string;
    };
}
export interface DashboardStats {
    pending: number;
    delivered: number;
    inRoute: number;
    failed: number;
    activeCouriers: number;
    callsToday: number;
    callEffectiveness: number;
    operatorPerformance: OperatorPerformance[];
    courierPerformance: CourierPerformance[];
    dailyStats: ChartDataPoint[];
    weeklyStats: ChartDataPoint[];
    monthlyStats: ChartDataPoint[];
    pendingPatients?: number;
    callManagementStats?: {
        total: number;
        byResult: Array<{
            result: string | null;
            count: number;
        }>;
        operators: Array<{
            operatorId: string;
            name: string;
            total: number;
            confirmed: number;
            effectiveness: number;
        }>;
    };
    operational?: {
        pendingCall: number;
        callCompleted: number;
        confirmed: number;
        assigned: number;
        inRoute: number;
        delivered: number;
        failed: number;
        incidents: number;
        deactivated: number;
        pendingPatients: number;
    };
}
export interface OperatorPerformance {
    operatorId: string;
    name: string;
    totalCalls: number;
    answered: number;
    effectiveness: number;
}
export interface CourierPerformance {
    courierId: string;
    name: string;
    totalDeliveries: number;
    completed: number;
    failed: number;
    completionRate: number;
}
export interface ChartDataPoint {
    label: string;
    value: number;
    delivered?: number;
    failed?: number;
}
export interface OfflineQueueItem {
    id: string;
    type: 'STATUS_UPDATE' | 'EVIDENCE' | 'INCIDENT' | 'GPS' | 'SIGNATURE';
    payload: Record<string, unknown>;
    retries: number;
    createdAt: string;
}
export interface SyncPayload {
    deviceId: string;
    items: OfflineQueueItem[];
}
export interface SocketEvents {
    'delivery.created': DeliveryDTO;
    'delivery.updated': DeliveryDTO;
    'delivery.completed': DeliveryDTO;
    'assignment.created': AssignmentDTO;
    'assignment.updated': AssignmentDTO;
    'incident.created': {
        id: string;
        deliveryId: string;
        type: IncidentType;
    };
}
export { BrandConfig } from './brand';
export type { BrandConfigType } from './brand';
