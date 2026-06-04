import { z } from 'zod';
export declare const listDeliveriesSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        status: z.ZodOptional<z.ZodNativeEnum<{
            PENDING_CALL: "PENDING_CALL";
            CALL_COMPLETED: "CALL_COMPLETED";
            CONFIRMED_FOR_DELIVERY: "CONFIRMED_FOR_DELIVERY";
            ASSIGNED: "ASSIGNED";
            IN_ROUTE: "IN_ROUTE";
            DELIVERED: "DELIVERED";
            PARTIALLY_DELIVERED: "PARTIALLY_DELIVERED";
            NOT_DELIVERED: "NOT_DELIVERED";
            CANCELLED: "CANCELLED";
            RETURNED: "RETURNED";
            PENDING: "PENDING";
            SCHEDULED: "SCHEDULED";
            FAILED: "FAILED";
            RESCHEDULED: "RESCHEDULED";
        }>>;
        priority: z.ZodOptional<z.ZodNativeEnum<{
            URGENT: "URGENT";
            HIGH: "HIGH";
            MEDIUM: "MEDIUM";
            LOW: "LOW";
        }>>;
        courierId: z.ZodOptional<z.ZodString>;
        driverId: z.ZodOptional<z.ZodString>;
        assignedById: z.ZodOptional<z.ZodString>;
        municipalityId: z.ZodOptional<z.ZodString>;
        search: z.ZodOptional<z.ZodString>;
        dateFrom: z.ZodOptional<z.ZodString>;
        dateTo: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        status?: "PENDING" | "CANCELLED" | "FAILED" | "CONFIRMED_FOR_DELIVERY" | "PENDING_CALL" | "CALL_COMPLETED" | "ASSIGNED" | "IN_ROUTE" | "DELIVERED" | "PARTIALLY_DELIVERED" | "NOT_DELIVERED" | "RETURNED" | "SCHEDULED" | "RESCHEDULED" | undefined;
        search?: string | undefined;
        courierId?: string | undefined;
        assignedById?: string | undefined;
        driverId?: string | undefined;
        municipalityId?: string | undefined;
        priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    }, {
        status?: "PENDING" | "CANCELLED" | "FAILED" | "CONFIRMED_FOR_DELIVERY" | "PENDING_CALL" | "CALL_COMPLETED" | "ASSIGNED" | "IN_ROUTE" | "DELIVERED" | "PARTIALLY_DELIVERED" | "NOT_DELIVERED" | "RETURNED" | "SCHEDULED" | "RESCHEDULED" | undefined;
        search?: string | undefined;
        courierId?: string | undefined;
        assignedById?: string | undefined;
        driverId?: string | undefined;
        municipalityId?: string | undefined;
        limit?: number | undefined;
        priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | undefined;
        page?: number | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        limit: number;
        page: number;
        status?: "PENDING" | "CANCELLED" | "FAILED" | "CONFIRMED_FOR_DELIVERY" | "PENDING_CALL" | "CALL_COMPLETED" | "ASSIGNED" | "IN_ROUTE" | "DELIVERED" | "PARTIALLY_DELIVERED" | "NOT_DELIVERED" | "RETURNED" | "SCHEDULED" | "RESCHEDULED" | undefined;
        search?: string | undefined;
        courierId?: string | undefined;
        assignedById?: string | undefined;
        driverId?: string | undefined;
        municipalityId?: string | undefined;
        priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    };
}, {
    query: {
        status?: "PENDING" | "CANCELLED" | "FAILED" | "CONFIRMED_FOR_DELIVERY" | "PENDING_CALL" | "CALL_COMPLETED" | "ASSIGNED" | "IN_ROUTE" | "DELIVERED" | "PARTIALLY_DELIVERED" | "NOT_DELIVERED" | "RETURNED" | "SCHEDULED" | "RESCHEDULED" | undefined;
        search?: string | undefined;
        courierId?: string | undefined;
        assignedById?: string | undefined;
        driverId?: string | undefined;
        municipalityId?: string | undefined;
        limit?: number | undefined;
        priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | undefined;
        page?: number | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    };
}>;
export declare const updateDeliveryStatusSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        status: z.ZodNativeEnum<{
            PENDING_CALL: "PENDING_CALL";
            CALL_COMPLETED: "CALL_COMPLETED";
            CONFIRMED_FOR_DELIVERY: "CONFIRMED_FOR_DELIVERY";
            ASSIGNED: "ASSIGNED";
            IN_ROUTE: "IN_ROUTE";
            DELIVERED: "DELIVERED";
            PARTIALLY_DELIVERED: "PARTIALLY_DELIVERED";
            NOT_DELIVERED: "NOT_DELIVERED";
            CANCELLED: "CANCELLED";
            RETURNED: "RETURNED";
            PENDING: "PENDING";
            SCHEDULED: "SCHEDULED";
            FAILED: "FAILED";
            RESCHEDULED: "RESCHEDULED";
        }>;
        lat: z.ZodOptional<z.ZodNumber>;
        lng: z.ZodOptional<z.ZodNumber>;
        accuracy: z.ZodOptional<z.ZodNumber>;
        failureReason: z.ZodOptional<z.ZodString>;
        observations: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "PENDING" | "CANCELLED" | "FAILED" | "CONFIRMED_FOR_DELIVERY" | "PENDING_CALL" | "CALL_COMPLETED" | "ASSIGNED" | "IN_ROUTE" | "DELIVERED" | "PARTIALLY_DELIVERED" | "NOT_DELIVERED" | "RETURNED" | "SCHEDULED" | "RESCHEDULED";
        lat?: number | undefined;
        lng?: number | undefined;
        accuracy?: number | undefined;
        observations?: string | undefined;
        failureReason?: string | undefined;
    }, {
        status: "PENDING" | "CANCELLED" | "FAILED" | "CONFIRMED_FOR_DELIVERY" | "PENDING_CALL" | "CALL_COMPLETED" | "ASSIGNED" | "IN_ROUTE" | "DELIVERED" | "PARTIALLY_DELIVERED" | "NOT_DELIVERED" | "RETURNED" | "SCHEDULED" | "RESCHEDULED";
        lat?: number | undefined;
        lng?: number | undefined;
        accuracy?: number | undefined;
        observations?: string | undefined;
        failureReason?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
    };
    body: {
        status: "PENDING" | "CANCELLED" | "FAILED" | "CONFIRMED_FOR_DELIVERY" | "PENDING_CALL" | "CALL_COMPLETED" | "ASSIGNED" | "IN_ROUTE" | "DELIVERED" | "PARTIALLY_DELIVERED" | "NOT_DELIVERED" | "RETURNED" | "SCHEDULED" | "RESCHEDULED";
        lat?: number | undefined;
        lng?: number | undefined;
        accuracy?: number | undefined;
        observations?: string | undefined;
        failureReason?: string | undefined;
    };
}, {
    params: {
        id: string;
    };
    body: {
        status: "PENDING" | "CANCELLED" | "FAILED" | "CONFIRMED_FOR_DELIVERY" | "PENDING_CALL" | "CALL_COMPLETED" | "ASSIGNED" | "IN_ROUTE" | "DELIVERED" | "PARTIALLY_DELIVERED" | "NOT_DELIVERED" | "RETURNED" | "SCHEDULED" | "RESCHEDULED";
        lat?: number | undefined;
        lng?: number | undefined;
        accuracy?: number | undefined;
        observations?: string | undefined;
        failureReason?: string | undefined;
    };
}>;
export declare const getDeliverySchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
    };
}, {
    params: {
        id: string;
    };
}>;
