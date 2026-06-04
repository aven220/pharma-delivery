"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsService = exports.ReportsService = exports.REPORT_TYPES = void 0;
const XLSX = __importStar(require("xlsx"));
const brand_1 = require("../../../config/brand");
const prisma_1 = require("../../../infra/database/prisma");
const report_labels_1 = require("./report-labels");
exports.REPORT_TYPES = [
    'patients-active',
    'patients-pending-calls',
    'deliveries-pending-calls',
    'deliveries-confirmed',
    'deliveries-in-field',
    'deliveries-completed',
    'deliveries-partial',
    'deliveries-not-delivered',
    'deliveries-for-recall',
    'deliveries-general',
    'deliveries-by-status',
    'deliveries-with-items',
    'calls-assignments',
    'calls-pending',
    'calls-completed',
    'calls-history',
    'calls-by-operator',
    'intermunicipal-routes',
    'intermunicipal-route-deliveries',
    'courier-routes-daily',
    'assignments-general',
    'couriers-deliveries',
    'couriers-incidents',
    'couriers-effectiveness',
    'incidents-general',
    'delivery-status-log',
    'excel-imports',
    'medications-catalog',
];
const DELIVERY_INCLUDE = {
    patient: true,
    municipality: true,
    items: {
        where: { deletedAt: null },
        include: { medication: true },
    },
    intermunicipalRouteDeliveries: {
        where: { deletedAt: null },
        include: {
            route: {
                select: { routeCode: true, status: true, routeDate: true, driver: { select: { firstName: true, lastName: true } } },
            },
        },
    },
    assignments: {
        where: { deletedAt: null },
        orderBy: { assignedAt: 'desc' },
        take: 1,
        include: {
            courier: { select: { firstName: true, lastName: true, documentId: true, operationalType: true } },
        },
    },
};
function buildDateRange(dateFrom, dateTo) {
    if (!dateFrom && !dateTo)
        return undefined;
    const range = {};
    if (dateFrom) {
        const d = new Date(dateFrom);
        d.setHours(0, 0, 0, 0);
        range.gte = d;
    }
    if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        range.lte = d;
    }
    return range;
}
function fmtDate(value) {
    return value ? value.toISOString().slice(0, 19).replace('T', ' ') : '';
}
function fmtDateOnly(value) {
    return value ? value.toISOString().slice(0, 10) : '';
}
class ReportsService {
    async generate(type, format, filters = {}) {
        const rows = await this.fetchData(type, filters);
        const filename = `${type}-${new Date().toISOString().slice(0, 10)}`;
        if (format === 'csv') {
            return {
                buffer: Buffer.from(this.toCsv(rows), 'utf-8'),
                filename: `${filename}.csv`,
                contentType: 'text/csv',
            };
        }
        if (format === 'html' || format === 'pdf') {
            return {
                buffer: Buffer.from(this.toHtml(type, rows), 'utf-8'),
                filename: `${filename}.html`,
                contentType: 'text/html; charset=utf-8',
            };
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return {
            buffer,
            filename: `${filename}.xlsx`,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
    }
    async fetchData(type, filters) {
        const dateFilter = buildDateRange(filters.dateFrom, filters.dateTo);
        switch (type) {
            case 'patients-active':
                return this.fetchPatientsActive();
            case 'patients-pending-calls':
                return this.fetchPatientsPendingCalls();
            case 'deliveries-pending-calls':
                return this.fetchDeliveriesByStatuses(['PENDING_CALL', 'CALL_COMPLETED', 'RESCHEDULED', 'PENDING', 'SCHEDULED'], dateFilter, 'createdAt', filters);
            case 'deliveries-confirmed':
                return this.fetchDeliveriesByStatuses(['CONFIRMED_FOR_DELIVERY'], dateFilter, 'updatedAt', filters);
            case 'deliveries-in-field':
                return this.fetchDeliveriesByStatuses(['ASSIGNED', 'IN_ROUTE'], dateFilter, 'updatedAt', filters);
            case 'deliveries-completed':
                return this.fetchDeliveriesByStatuses(['DELIVERED'], dateFilter, 'deliveredAt', filters);
            case 'deliveries-partial':
                return this.fetchDeliveriesByStatuses(['PARTIALLY_DELIVERED'], dateFilter, 'deliveredAt', filters);
            case 'deliveries-not-delivered':
                return this.fetchDeliveriesByStatuses(['NOT_DELIVERED', 'FAILED'], dateFilter, 'failedAt', filters);
            case 'deliveries-for-recall':
                return this.fetchDeliveriesByStatuses(['PARTIALLY_DELIVERED', 'NOT_DELIVERED'], dateFilter, 'updatedAt', filters);
            case 'deliveries-general':
                return this.fetchDeliveriesGeneral(dateFilter, filters);
            case 'deliveries-by-status':
                return this.fetchDeliveriesByStatusSummary(dateFilter, filters);
            case 'deliveries-with-items':
                return this.fetchDeliveriesWithItems(dateFilter, filters);
            case 'calls-assignments':
                return this.fetchCallAssignments(dateFilter, filters, false);
            case 'calls-pending':
                return this.fetchCallAssignments(dateFilter, filters, true);
            case 'calls-completed':
                return this.fetchCallAssignmentsCompleted(dateFilter, filters);
            case 'calls-history':
                return this.fetchCallHistory(dateFilter, filters);
            case 'calls-by-operator':
                return this.fetchCallsByOperator(dateFilter);
            case 'intermunicipal-routes':
                return this.fetchIntermunicipalRoutes(dateFilter, filters);
            case 'intermunicipal-route-deliveries':
                return this.fetchIntermunicipalRouteDeliveries(dateFilter, filters);
            case 'courier-routes-daily':
                return this.fetchCourierRoutesDaily(dateFilter, filters);
            case 'assignments-general':
                return this.fetchAssignmentsGeneral(dateFilter, filters);
            case 'couriers-deliveries':
                return this.fetchCouriersDeliveries(dateFilter, filters);
            case 'couriers-incidents':
                return this.fetchCouriersIncidents(dateFilter, filters);
            case 'couriers-effectiveness':
                return this.fetchCouriersEffectiveness(dateFilter, filters);
            case 'incidents-general':
                return this.fetchIncidentsGeneral(dateFilter, filters);
            case 'delivery-status-log':
                return this.fetchDeliveryStatusLog(dateFilter, filters);
            case 'excel-imports':
                return this.fetchExcelImports(dateFilter);
            case 'medications-catalog':
                return this.fetchMedicationsCatalog(filters);
            default:
                return [];
        }
    }
    async fetchPatientsActive() {
        return (await prisma_1.prisma.patient.findMany({
            where: {
                deletedAt: null,
                deliveries: { some: { status: { notIn: ['CANCELLED', 'RETURNED'] }, deletedAt: null } },
            },
            select: {
                documentId: true,
                documentType: true,
                firstName: true,
                lastName: true,
                phone: true,
                phoneAlt: true,
                address: true,
                city: true,
                neighborhood: true,
            },
        })).map((p) => ({
            documento: p.documentId,
            tipoDocumento: p.documentType,
            nombre: `${p.firstName} ${p.lastName}`,
            telefono: p.phone,
            telefonoAlt: p.phoneAlt,
            direccion: p.address,
            ciudad: p.city,
            barrio: p.neighborhood,
        }));
    }
    async fetchPatientsPendingCalls() {
        return (await prisma_1.prisma.patient.findMany({
            where: {
                deletedAt: null,
                deliveries: {
                    some: {
                        deletedAt: null,
                        status: { in: ['PENDING_CALL', 'RESCHEDULED', 'CALL_COMPLETED'] },
                    },
                },
            },
            include: {
                deliveries: {
                    where: {
                        deletedAt: null,
                        status: { in: ['PENDING_CALL', 'RESCHEDULED', 'CALL_COMPLETED'] },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                },
            },
        })).map((p) => ({
            documento: p.documentId,
            nombre: `${p.firstName} ${p.lastName}`,
            telefono: p.phone,
            entregasPendientes: p.deliveries.map((d) => d.deliveryNumber).join(', '),
            estados: p.deliveries.map((d) => (0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, d.status)).join(', '),
        }));
    }
    deliveryWhere(statuses, dateFilter, dateField, filters) {
        return {
            deletedAt: null,
            status: filters.status ? filters.status : { in: statuses },
            ...(dateFilter && { [dateField]: dateFilter }),
            ...(filters.municipalityId && { municipalityId: filters.municipalityId }),
        };
    }
    async fetchDeliveriesByStatuses(statuses, dateFilter, dateField, filters) {
        const deliveries = await prisma_1.prisma.delivery.findMany({
            where: this.deliveryWhere(statuses, dateFilter, dateField, filters),
            include: DELIVERY_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
        return deliveries.map((d) => this.mapDeliveryRow(d));
    }
    async fetchDeliveriesGeneral(dateFilter, filters) {
        const deliveries = await prisma_1.prisma.delivery.findMany({
            where: {
                deletedAt: null,
                ...(filters.status && { status: filters.status }),
                ...(dateFilter && { createdAt: dateFilter }),
                ...(filters.municipalityId && { municipalityId: filters.municipalityId }),
            },
            include: DELIVERY_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
        return deliveries.map((d) => this.mapDeliveryRow(d));
    }
    async fetchDeliveriesByStatusSummary(dateFilter, filters) {
        const groups = await prisma_1.prisma.delivery.groupBy({
            by: ['status'],
            where: {
                deletedAt: null,
                ...(dateFilter && { createdAt: dateFilter }),
                ...(filters.municipalityId && { municipalityId: filters.municipalityId }),
            },
            _count: true,
        });
        return groups
            .sort((a, b) => a.status.localeCompare(b.status))
            .map((g) => ({
            estado: (0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, g.status),
            codigoEstado: g.status,
            cantidad: g._count,
        }));
    }
    async fetchDeliveriesWithItems(dateFilter, filters) {
        const deliveries = await prisma_1.prisma.delivery.findMany({
            where: {
                deletedAt: null,
                ...(filters.status && { status: filters.status }),
                ...(dateFilter && { createdAt: dateFilter }),
                ...(filters.municipalityId && { municipalityId: filters.municipalityId }),
            },
            include: DELIVERY_INCLUDE,
            orderBy: { deliveryNumber: 'asc' },
        });
        const rows = [];
        for (const d of deliveries) {
            const base = this.mapDeliveryRow(d);
            if (d.items.length === 0) {
                rows.push({ ...base, medicamento: '', cum: '', cantidad: 0, lote: '' });
                continue;
            }
            for (const item of d.items) {
                rows.push({
                    ...base,
                    medicamento: item.medication.name,
                    cum: item.medication.cum,
                    codigoMedicamento: item.medication.code,
                    cantidad: item.quantity,
                    lote: item.lotNumber,
                });
            }
        }
        return rows;
    }
    mapDeliveryRow(d) {
        const routeLink = d.intermunicipalRouteDeliveries[0];
        const assignment = d.assignments[0];
        const medications = d.items.map((i) => `${i.medication.name} x${i.quantity}`).join('; ');
        return {
            numeroEntrega: d.deliveryNumber,
            nroDocumento: d.documentNumber,
            estado: (0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, d.status),
            codigoEstado: d.status,
            prioridad: (0, report_labels_1.label)(report_labels_1.PRIORITY_LABELS, d.priority),
            paciente: `${d.patient.firstName} ${d.patient.lastName}`,
            documentoPaciente: d.patient.documentId,
            telefono: d.patient.phone,
            direccion: d.patient.address,
            municipio: d.municipality?.name || '',
            medicamentos: medications,
            fechaProgramada: fmtDateOnly(d.scheduledDate),
            horaProgramada: d.scheduledTime,
            fechaEntrega: fmtDate(d.deliveredAt),
            fechaFallo: fmtDate(d.failedAt),
            motivoFallo: d.failureReason,
            observaciones: d.observations,
            rutaCodigo: routeLink?.route.routeCode || '',
            rutaEstado: routeLink ? (0, report_labels_1.label)(report_labels_1.INTERMUNICIPAL_ROUTE_STATUS_LABELS, routeLink.route.status) : '',
            conductorRuta: routeLink?.route.driver
                ? `${routeLink.route.driver.firstName} ${routeLink.route.driver.lastName}`
                : '',
            domiciliario: assignment?.courier
                ? `${assignment.courier.firstName} ${assignment.courier.lastName}`
                : '',
            documentoDomiciliario: assignment?.courier.documentId || '',
            tipoOperativo: assignment?.courier.operationalType || '',
            fechaCreacion: fmtDate(d.createdAt),
        };
    }
    async fetchCallAssignments(dateFilter, filters, pendingOnly) {
        const rows = await prisma_1.prisma.callAssignment.findMany({
            where: {
                deletedAt: null,
                ...(pendingOnly && {
                    completedAt: null,
                    status: { in: ['PENDING', 'CALLED', 'NO_ANSWER', 'OFF', 'ANSWERED', 'RESCHEDULE'] },
                }),
                ...(dateFilter && { assignedAt: dateFilter }),
                ...(filters.operatorId && { operatorUserId: filters.operatorId }),
            },
            include: {
                delivery: {
                    include: {
                        patient: true,
                    },
                },
                operator: { select: { firstName: true, lastName: true, email: true } },
                assignedBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { assignedAt: 'desc' },
        });
        return rows.map((c) => ({
            entrega: c.delivery.deliveryNumber,
            nroDocumento: c.delivery.documentNumber,
            paciente: `${c.delivery.patient.firstName} ${c.delivery.patient.lastName}`,
            documentoPaciente: c.delivery.patient.documentId,
            telefono: c.delivery.patient.phone,
            estadoEntrega: (0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, c.delivery.status),
            operador: `${c.operator.firstName} ${c.operator.lastName}`,
            emailOperador: c.operator.email,
            asignadoPor: `${c.assignedBy.firstName} ${c.assignedBy.lastName}`,
            estadoLlamada: (0, report_labels_1.label)(report_labels_1.CALL_QUEUE_STATUS_LABELS, c.status),
            resultadoGestion: (0, report_labels_1.label)(report_labels_1.CALL_MANAGEMENT_RESULT_LABELS, c.managementResult),
            observaciones: c.observations,
            telefonoUsado: c.phoneUsed,
            duracionSeg: c.durationSec,
            fechaAsignacion: fmtDate(c.assignedAt),
            fechaCompletada: fmtDate(c.completedAt),
        }));
    }
    async fetchCallAssignmentsCompleted(dateFilter, filters) {
        const rows = await prisma_1.prisma.callAssignment.findMany({
            where: {
                deletedAt: null,
                completedAt: { not: null },
                ...(dateFilter && { completedAt: dateFilter }),
                ...(filters.operatorId && { operatorUserId: filters.operatorId }),
            },
            include: {
                delivery: { include: { patient: true } },
                operator: { select: { firstName: true, lastName: true } },
            },
            orderBy: { completedAt: 'desc' },
        });
        return rows.map((c) => ({
            entrega: c.delivery.deliveryNumber,
            paciente: `${c.delivery.patient.firstName} ${c.delivery.patient.lastName}`,
            estadoEntrega: (0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, c.delivery.status),
            operador: `${c.operator.firstName} ${c.operator.lastName}`,
            estadoLlamada: (0, report_labels_1.label)(report_labels_1.CALL_QUEUE_STATUS_LABELS, c.status),
            resultadoGestion: (0, report_labels_1.label)(report_labels_1.CALL_MANAGEMENT_RESULT_LABELS, c.managementResult),
            observaciones: c.observations,
            fechaCompletada: fmtDate(c.completedAt),
        }));
    }
    async fetchCallHistory(dateFilter, filters) {
        const rows = await prisma_1.prisma.callHistory.findMany({
            where: {
                ...(dateFilter && { calledAt: dateFilter }),
                ...(filters.operatorId && { operator: { userId: filters.operatorId } }),
            },
            include: {
                delivery: { select: { deliveryNumber: true, status: true } },
                patient: { select: { firstName: true, lastName: true, documentId: true } },
                operator: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: { calledAt: 'desc' },
        });
        return rows.map((c) => ({
            entrega: c.delivery.deliveryNumber,
            estadoEntrega: (0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, c.delivery.status),
            paciente: `${c.patient.firstName} ${c.patient.lastName}`,
            documento: c.patient.documentId,
            operador: `${c.operator.user.firstName} ${c.operator.user.lastName}`,
            telefonoUsado: c.phoneUsed,
            resultado: c.result,
            duracionSeg: c.durationSec,
            observaciones: c.observations,
            nuevaFecha: fmtDateOnly(c.rescheduleDate),
            nuevaHora: c.rescheduleTime,
            fechaLlamada: fmtDate(c.calledAt),
        }));
    }
    async fetchCallsByOperator(dateFilter) {
        const stats = await prisma_1.prisma.callAssignment.groupBy({
            by: ['operatorUserId', 'managementResult'],
            where: {
                deletedAt: null,
                managementResult: { not: null },
                ...(dateFilter && { completedAt: dateFilter }),
            },
            _count: true,
        });
        const result = [];
        for (const s of stats) {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: s.operatorUserId },
                select: { firstName: true, lastName: true, email: true },
            });
            result.push({
                operador: user ? `${user.firstName} ${user.lastName}` : s.operatorUserId,
                email: user?.email || '',
                resultado: (0, report_labels_1.label)(report_labels_1.CALL_MANAGEMENT_RESULT_LABELS, s.managementResult),
                codigoResultado: s.managementResult,
                cantidad: s._count,
            });
        }
        return result;
    }
    async fetchIntermunicipalRoutes(dateFilter, filters) {
        const routes = await prisma_1.prisma.intermunicipalRoute.findMany({
            where: {
                deletedAt: null,
                ...(filters.status && { status: filters.status }),
                ...(filters.municipalityId && { municipalityId: filters.municipalityId }),
                ...(filters.routeId && { id: filters.routeId }),
                ...(dateFilter && { routeDate: dateFilter }),
            },
            include: {
                driver: { select: { firstName: true, lastName: true, documentId: true } },
                municipality: true,
                deliveries: {
                    where: { deletedAt: null },
                    include: { delivery: { select: { status: true } } },
                },
            },
            orderBy: [{ routeDate: 'desc' }, { routeCode: 'asc' }],
        });
        return routes.map((r) => {
            const statuses = r.deliveries.map((rd) => rd.delivery.status);
            return {
                codigoRuta: r.routeCode,
                fechaRuta: fmtDateOnly(r.routeDate),
                municipio: r.municipality.name,
                estado: (0, report_labels_1.label)(report_labels_1.INTERMUNICIPAL_ROUTE_STATUS_LABELS, r.status),
                conductor: `${r.driver.firstName} ${r.driver.lastName}`,
                documentoConductor: r.driver.documentId,
                totalEntregas: r.deliveries.length,
                entregadas: statuses.filter((s) => s === 'DELIVERED').length,
                parciales: statuses.filter((s) => s === 'PARTIALLY_DELIVERED').length,
                noEntregadas: statuses.filter((s) => ['NOT_DELIVERED', 'FAILED'].includes(s)).length,
                pendientes: statuses.filter((s) => !['DELIVERED', 'PARTIALLY_DELIVERED', 'NOT_DELIVERED', 'FAILED', 'CANCELLED', 'RETURNED'].includes(s)).length,
                despachada: fmtDate(r.dispatchedAt),
                finalizada: fmtDate(r.closedAt),
                observaciones: r.observations,
            };
        });
    }
    async fetchIntermunicipalRouteDeliveries(dateFilter, filters) {
        const links = await prisma_1.prisma.intermunicipalRouteDelivery.findMany({
            where: {
                deletedAt: null,
                ...(filters.routeId && { routeId: filters.routeId }),
                route: {
                    deletedAt: null,
                    ...(filters.municipalityId && { municipalityId: filters.municipalityId }),
                    ...(dateFilter && { routeDate: dateFilter }),
                },
            },
            include: {
                route: {
                    include: {
                        driver: { select: { firstName: true, lastName: true } },
                        municipality: true,
                    },
                },
                delivery: { include: DELIVERY_INCLUDE },
            },
            orderBy: [{ route: { routeDate: 'desc' } }, { stopOrder: 'asc' }],
        });
        return links.map((link) => ({
            codigoRuta: link.route.routeCode,
            fechaRuta: fmtDateOnly(link.route.routeDate),
            municipio: link.route.municipality.name,
            ordenParada: link.stopOrder + 1,
            estadoRuta: (0, report_labels_1.label)(report_labels_1.INTERMUNICIPAL_ROUTE_STATUS_LABELS, link.route.status),
            conductor: `${link.route.driver.firstName} ${link.route.driver.lastName}`,
            ...this.mapDeliveryRow(link.delivery),
        }));
    }
    async fetchCourierRoutesDaily(dateFilter, filters) {
        const routes = await prisma_1.prisma.courierRoute.findMany({
            where: {
                ...(filters.courierId && { courierId: filters.courierId }),
                ...(dateFilter && { routeDate: dateFilter }),
            },
            include: {
                courier: { select: { firstName: true, lastName: true, documentId: true } },
                assignments: {
                    where: { deletedAt: null },
                    include: {
                        delivery: { select: { deliveryNumber: true, status: true } },
                    },
                },
            },
            orderBy: [{ routeDate: 'desc' }],
        });
        return routes.map((r) => ({
            fechaRuta: fmtDateOnly(r.routeDate),
            domiciliario: `${r.courier.firstName} ${r.courier.lastName}`,
            documento: r.courier.documentId,
            estado: (0, report_labels_1.label)(report_labels_1.COURIER_ROUTE_STATUS_LABELS, r.status),
            totalParadas: r.totalStops,
            completadas: r.completedStops,
            pendientes: r.pendingStops,
            entregas: r.assignments.map((a) => a.delivery.deliveryNumber).join(', '),
            estadosEntregas: r.assignments
                .map((a) => `${a.delivery.deliveryNumber}:${(0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, a.delivery.status)}`)
                .join('; '),
            notas: r.notes,
        }));
    }
    async fetchAssignmentsGeneral(dateFilter, filters) {
        const rows = await prisma_1.prisma.assignment.findMany({
            where: {
                deletedAt: null,
                ...(dateFilter && { assignedAt: dateFilter }),
                ...(filters.courierId && { courierId: filters.courierId }),
            },
            include: {
                delivery: { include: { patient: true } },
                courier: { select: { firstName: true, lastName: true, documentId: true, operationalType: true } },
                route: { select: { routeDate: true, status: true } },
                intermunicipalRoute: { select: { routeCode: true, status: true } },
                assignedBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { assignedAt: 'desc' },
        });
        return rows.map((a) => ({
            entrega: a.delivery.deliveryNumber,
            paciente: `${a.delivery.patient.firstName} ${a.delivery.patient.lastName}`,
            estadoEntrega: (0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, a.delivery.status),
            domiciliario: `${a.courier.firstName} ${a.courier.lastName}`,
            documentoDomiciliario: a.courier.documentId,
            tipoOperativo: a.courier.operationalType,
            estadoAsignacion: (0, report_labels_1.label)(report_labels_1.ASSIGNMENT_STATUS_LABELS, a.status),
            ordenRuta: a.routeOrder,
            rutaDiaria: a.route ? fmtDateOnly(a.route.routeDate) : '',
            rutaIntermunicipal: a.intermunicipalRoute?.routeCode || '',
            asignadoPor: `${a.assignedBy.firstName} ${a.assignedBy.lastName}`,
            fechaAsignacion: fmtDate(a.assignedAt),
            fechaCompletada: fmtDate(a.completedAt),
            notas: a.notes,
        }));
    }
    async fetchCouriersDeliveries(dateFilter, filters) {
        const rows = await prisma_1.prisma.assignment.findMany({
            where: {
                deletedAt: null,
                ...(dateFilter && { assignedAt: dateFilter }),
                ...(filters.courierId && { courierId: filters.courierId }),
            },
            include: {
                delivery: { include: { patient: true } },
                courier: { select: { firstName: true, lastName: true, documentId: true, operationalType: true } },
            },
            orderBy: { assignedAt: 'desc' },
        });
        return rows.map((a) => ({
            domiciliario: `${a.courier.firstName} ${a.courier.lastName}`,
            documento: a.courier.documentId,
            tipoOperativo: a.courier.operationalType,
            entrega: a.delivery.deliveryNumber,
            paciente: `${a.delivery.patient.firstName} ${a.delivery.patient.lastName}`,
            estadoEntrega: (0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, a.delivery.status),
            estadoAsignacion: (0, report_labels_1.label)(report_labels_1.ASSIGNMENT_STATUS_LABELS, a.status),
            asignada: fmtDate(a.assignedAt),
            completada: fmtDate(a.completedAt),
        }));
    }
    async fetchCouriersIncidents(dateFilter, filters) {
        return this.fetchIncidentsGeneral(dateFilter, filters);
    }
    async fetchIncidentsGeneral(dateFilter, filters) {
        const rows = await prisma_1.prisma.incident.findMany({
            where: {
                deletedAt: null,
                ...(dateFilter && { createdAt: dateFilter }),
                ...(filters.courierId && { reportedById: filters.courierId }),
            },
            include: {
                delivery: { include: { patient: true } },
                reportedBy: { select: { firstName: true, lastName: true, operationalType: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((i) => ({
            entrega: i.delivery.deliveryNumber,
            paciente: `${i.delivery.patient.firstName} ${i.delivery.patient.lastName}`,
            reportadoPor: `${i.reportedBy.firstName} ${i.reportedBy.lastName}`,
            tipoOperativo: i.reportedBy.operationalType,
            tipo: (0, report_labels_1.label)(report_labels_1.INCIDENT_LABELS, i.type),
            codigoTipo: i.type,
            estado: i.status,
            descripcion: i.description,
            latitud: i.lat,
            longitud: i.lng,
            resuelta: fmtDate(i.resolvedAt),
            resolucion: i.resolution,
            fecha: fmtDate(i.createdAt),
        }));
    }
    async fetchCouriersEffectiveness(dateFilter, filters) {
        const couriers = await prisma_1.prisma.user.findMany({
            where: {
                deletedAt: null,
                ...(filters.courierId && { id: filters.courierId }),
                OR: [
                    { courierProfile: { isNot: null } },
                    { operationalType: { in: ['DOMICILIARIO', 'CONDUCTOR_RUTA'] } },
                ],
            },
            include: { courierProfile: true },
        });
        return Promise.all(couriers.map(async (c) => {
            const assignments = await prisma_1.prisma.assignment.findMany({
                where: {
                    courierId: c.id,
                    deletedAt: null,
                    ...(dateFilter && { assignedAt: dateFilter }),
                },
                include: { delivery: { select: { status: true } } },
            });
            const total = assignments.length;
            const delivered = assignments.filter((a) => a.delivery.status === 'DELIVERED').length;
            const partial = assignments.filter((a) => a.delivery.status === 'PARTIALLY_DELIVERED').length;
            const notDelivered = assignments.filter((a) => ['NOT_DELIVERED', 'FAILED'].includes(a.delivery.status)).length;
            const inProgress = assignments.filter((a) => ['ASSIGNED', 'IN_ROUTE', 'CONFIRMED_FOR_DELIVERY'].includes(a.delivery.status)).length;
            const incidents = await prisma_1.prisma.incident.count({
                where: {
                    reportedById: c.id,
                    deletedAt: null,
                    ...(dateFilter && { createdAt: dateFilter }),
                },
            });
            const closed = delivered + partial + notDelivered;
            return {
                nombre: `${c.firstName} ${c.lastName}`,
                documento: c.documentId,
                tipoOperativo: c.operationalType || 'DOMICILIARIO',
                zona: c.courierProfile?.zone || '',
                asignaciones: total,
                entregadas: delivered,
                parciales: partial,
                noEntregadas: notDelivered,
                enProceso: inProgress,
                incidencias: incidents,
                efectividadEntrega: closed > 0 ? `${Math.round((delivered / closed) * 100)}%` : '0%',
                tasaCierre: total > 0 ? `${Math.round((closed / total) * 100)}%` : '0%',
            };
        }));
    }
    async fetchDeliveryStatusLog(dateFilter, filters) {
        const rows = await prisma_1.prisma.deliveryStatusLog.findMany({
            where: {
                ...(dateFilter && { createdAt: dateFilter }),
                ...(filters.status && { toStatus: filters.status }),
            },
            include: {
                delivery: { select: { deliveryNumber: true, documentNumber: true } },
                changedBy: { select: { firstName: true, lastName: true, role: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((log) => ({
            entrega: log.delivery.deliveryNumber,
            nroDocumento: log.delivery.documentNumber,
            estadoAnterior: (0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, log.fromStatus),
            estadoNuevo: (0, report_labels_1.label)(report_labels_1.DELIVERY_STATUS_LABELS, log.toStatus),
            accion: log.action,
            observaciones: log.observations,
            cambiadoPor: `${log.changedBy.firstName} ${log.changedBy.lastName}`,
            rol: log.changedBy.role.name,
            fecha: fmtDate(log.createdAt),
        }));
    }
    async fetchExcelImports(dateFilter) {
        const rows = await prisma_1.prisma.excelImport.findMany({
            where: {
                ...(dateFilter && { createdAt: dateFilter }),
            },
            include: {
                importedBy: { select: { firstName: true, lastName: true } },
                _count: { select: { deliveries: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((imp) => ({
            archivo: imp.fileName,
            estado: (0, report_labels_1.label)(report_labels_1.EXCEL_IMPORT_STATUS_LABELS, imp.status),
            importadoPor: `${imp.importedBy.firstName} ${imp.importedBy.lastName}`,
            filasTotales: imp.totalRows,
            filasProcesadas: imp.processedRows,
            insertados: imp.insertedCount,
            actualizados: imp.updatedCount,
            errores: imp.errorCount,
            entregasGeneradas: imp._count.deliveries,
            iniciado: fmtDate(imp.startedAt),
            completado: fmtDate(imp.completedAt),
            fechaCarga: fmtDate(imp.createdAt),
        }));
    }
    async fetchMedicationsCatalog(filters) {
        const rows = await prisma_1.prisma.medication.findMany({
            where: {
                deletedAt: null,
                ...(filters.status && { status: filters.status }),
            },
            orderBy: [{ name: 'asc' }],
        });
        return rows.map((m) => ({
            codigo: m.code,
            cum: m.cum,
            nombre: m.name,
            laboratorio: m.laboratory,
            presentacion: m.presentation,
            concentracion: m.concentration,
            estado: m.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
            cadenaFrio: m.requiresColdChain ? 'Sí' : 'No',
            descripcion: m.description,
        }));
    }
    toHtml(type, rows) {
        const header = brand_1.BrandConfig.reportHeader;
        if (rows.length === 0) {
            return `<html><body><h1>${header}</h1><h2>Reporte: ${type}</h2><p>Sin datos</p></body></html>`;
        }
        const headers = Object.keys(rows[0]);
        const head = headers.map((h) => `<th>${h}</th>`).join('');
        const body = rows
            .map((row) => `<tr>${headers.map((h) => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`)
            .join('');
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${header} - ${type}</title>
      <style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}th{background:#f3f4f6}</style></head>
      <body><h1>${header}</h1><h2>Reporte: ${type}</h2><p>Generado: ${new Date().toLocaleString('es-CO')}</p>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
    }
    toCsv(rows) {
        if (rows.length === 0)
            return '';
        const headers = Object.keys(rows[0]);
        const lines = [headers.join(',')];
        for (const row of rows) {
            lines.push(headers
                .map((h) => {
                const val = row[h];
                const str = val === null || val === undefined ? '' : String(val);
                return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            })
                .join(','));
        }
        return lines.join('\n');
    }
}
exports.ReportsService = ReportsService;
exports.reportsService = new ReportsService();
