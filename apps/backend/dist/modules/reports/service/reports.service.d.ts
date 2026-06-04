export declare const REPORT_TYPES: readonly ["patients-active", "patients-pending-calls", "deliveries-pending-calls", "deliveries-confirmed", "deliveries-in-field", "deliveries-completed", "deliveries-partial", "deliveries-not-delivered", "deliveries-for-recall", "deliveries-general", "deliveries-by-status", "deliveries-with-items", "calls-assignments", "calls-pending", "calls-completed", "calls-history", "calls-by-operator", "intermunicipal-routes", "intermunicipal-route-deliveries", "courier-routes-daily", "assignments-general", "couriers-deliveries", "couriers-incidents", "couriers-effectiveness", "incidents-general", "delivery-status-log", "excel-imports", "medications-catalog"];
export type ReportType = (typeof REPORT_TYPES)[number];
interface ReportFilters {
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    operatorId?: string;
    courierId?: string;
    municipalityId?: string;
    routeId?: string;
}
export declare class ReportsService {
    generate(type: ReportType, format: 'csv' | 'xlsx' | 'html' | 'pdf', filters?: ReportFilters): Promise<{
        buffer: Buffer;
        filename: string;
        contentType: string;
    }>;
    private fetchData;
    private fetchPatientsActive;
    private fetchPatientsPendingCalls;
    private deliveryWhere;
    private fetchDeliveriesByStatuses;
    private fetchDeliveriesGeneral;
    private fetchDeliveriesByStatusSummary;
    private fetchDeliveriesWithItems;
    private mapDeliveryRow;
    private fetchCallAssignments;
    private fetchCallAssignmentsCompleted;
    private fetchCallHistory;
    private fetchCallsByOperator;
    private fetchIntermunicipalRoutes;
    private fetchIntermunicipalRouteDeliveries;
    private fetchCourierRoutesDaily;
    private fetchAssignmentsGeneral;
    private fetchCouriersDeliveries;
    private fetchCouriersIncidents;
    private fetchIncidentsGeneral;
    private fetchCouriersEffectiveness;
    private fetchDeliveryStatusLog;
    private fetchExcelImports;
    private fetchMedicationsCatalog;
    private toHtml;
    private toCsv;
}
export declare const reportsService: ReportsService;
export {};
