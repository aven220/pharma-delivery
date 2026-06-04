import { z } from 'zod';
export declare const createPatientManualSchema: z.ZodObject<{
    body: z.ZodObject<{
        documentId: z.ZodString;
        documentType: z.ZodDefault<z.ZodString>;
        firstName: z.ZodString;
        lastName: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        address: z.ZodString;
        city: z.ZodOptional<z.ZodString>;
        neighborhood: z.ZodOptional<z.ZodString>;
        observations: z.ZodOptional<z.ZodString>;
        priority: z.ZodDefault<z.ZodNativeEnum<{
            URGENT: "URGENT";
            HIGH: "HIGH";
            MEDIUM: "MEDIUM";
            LOW: "LOW";
        }>>;
        scheduledDate: z.ZodOptional<z.ZodString>;
        scheduledTime: z.ZodOptional<z.ZodString>;
        documentNumber: z.ZodOptional<z.ZodString>;
        medications: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            medicationCode: z.ZodString;
            medicationName: z.ZodString;
            quantity: z.ZodDefault<z.ZodNumber>;
            lotNumber: z.ZodOptional<z.ZodString>;
            observations: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            quantity: number;
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            lotNumber?: string | undefined;
        }, {
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            quantity?: number | undefined;
            lotNumber?: string | undefined;
        }>, "many">>>;
    }, "strip", z.ZodTypeAny, {
        firstName: string;
        lastName: string;
        documentId: string;
        priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
        documentType: string;
        address: string;
        medications: {
            quantity: number;
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            lotNumber?: string | undefined;
        }[];
        phone?: string | undefined;
        observations?: string | undefined;
        documentNumber?: string | undefined;
        scheduledDate?: string | undefined;
        scheduledTime?: string | undefined;
        city?: string | undefined;
        neighborhood?: string | undefined;
    }, {
        firstName: string;
        lastName: string;
        documentId: string;
        address: string;
        phone?: string | undefined;
        observations?: string | undefined;
        priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | undefined;
        documentNumber?: string | undefined;
        scheduledDate?: string | undefined;
        scheduledTime?: string | undefined;
        documentType?: string | undefined;
        city?: string | undefined;
        neighborhood?: string | undefined;
        medications?: {
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            quantity?: number | undefined;
            lotNumber?: string | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        firstName: string;
        lastName: string;
        documentId: string;
        priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
        documentType: string;
        address: string;
        medications: {
            quantity: number;
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            lotNumber?: string | undefined;
        }[];
        phone?: string | undefined;
        observations?: string | undefined;
        documentNumber?: string | undefined;
        scheduledDate?: string | undefined;
        scheduledTime?: string | undefined;
        city?: string | undefined;
        neighborhood?: string | undefined;
    };
}, {
    body: {
        firstName: string;
        lastName: string;
        documentId: string;
        address: string;
        phone?: string | undefined;
        observations?: string | undefined;
        priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | undefined;
        documentNumber?: string | undefined;
        scheduledDate?: string | undefined;
        scheduledTime?: string | undefined;
        documentType?: string | undefined;
        city?: string | undefined;
        neighborhood?: string | undefined;
        medications?: {
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            quantity?: number | undefined;
            lotNumber?: string | undefined;
        }[] | undefined;
    };
}>;
export declare const listPatientsSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        search?: string | undefined;
    }, {
        search?: string | undefined;
        limit?: number | undefined;
        page?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        limit: number;
        page: number;
        search?: string | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        limit?: number | undefined;
        page?: number | undefined;
    };
}>;
export declare const patientIdSchema: z.ZodObject<{
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
export declare const createDeliveryManualSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        patientId: z.ZodOptional<z.ZodString>;
        newPatient: z.ZodOptional<z.ZodObject<{
            documentId: z.ZodString;
            documentType: z.ZodDefault<z.ZodString>;
            firstName: z.ZodString;
            lastName: z.ZodString;
            phone: z.ZodOptional<z.ZodString>;
            address: z.ZodString;
            city: z.ZodOptional<z.ZodString>;
            neighborhood: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            firstName: string;
            lastName: string;
            documentId: string;
            documentType: string;
            address: string;
            phone?: string | undefined;
            city?: string | undefined;
            neighborhood?: string | undefined;
        }, {
            firstName: string;
            lastName: string;
            documentId: string;
            address: string;
            phone?: string | undefined;
            documentType?: string | undefined;
            city?: string | undefined;
            neighborhood?: string | undefined;
        }>>;
        priority: z.ZodDefault<z.ZodNativeEnum<{
            URGENT: "URGENT";
            HIGH: "HIGH";
            MEDIUM: "MEDIUM";
            LOW: "LOW";
        }>>;
        observations: z.ZodOptional<z.ZodString>;
        scheduledDate: z.ZodOptional<z.ZodString>;
        scheduledTime: z.ZodOptional<z.ZodString>;
        documentNumber: z.ZodOptional<z.ZodString>;
        medications: z.ZodArray<z.ZodObject<{
            medicationCode: z.ZodString;
            medicationName: z.ZodString;
            quantity: z.ZodDefault<z.ZodNumber>;
            lotNumber: z.ZodOptional<z.ZodString>;
            observations: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            quantity: number;
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            lotNumber?: string | undefined;
        }, {
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            quantity?: number | undefined;
            lotNumber?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
        medications: {
            quantity: number;
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            lotNumber?: string | undefined;
        }[];
        observations?: string | undefined;
        patientId?: string | undefined;
        documentNumber?: string | undefined;
        scheduledDate?: string | undefined;
        scheduledTime?: string | undefined;
        newPatient?: {
            firstName: string;
            lastName: string;
            documentId: string;
            documentType: string;
            address: string;
            phone?: string | undefined;
            city?: string | undefined;
            neighborhood?: string | undefined;
        } | undefined;
    }, {
        medications: {
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            quantity?: number | undefined;
            lotNumber?: string | undefined;
        }[];
        observations?: string | undefined;
        patientId?: string | undefined;
        priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | undefined;
        documentNumber?: string | undefined;
        scheduledDate?: string | undefined;
        scheduledTime?: string | undefined;
        newPatient?: {
            firstName: string;
            lastName: string;
            documentId: string;
            address: string;
            phone?: string | undefined;
            documentType?: string | undefined;
            city?: string | undefined;
            neighborhood?: string | undefined;
        } | undefined;
    }>, {
        priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
        medications: {
            quantity: number;
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            lotNumber?: string | undefined;
        }[];
        observations?: string | undefined;
        patientId?: string | undefined;
        documentNumber?: string | undefined;
        scheduledDate?: string | undefined;
        scheduledTime?: string | undefined;
        newPatient?: {
            firstName: string;
            lastName: string;
            documentId: string;
            documentType: string;
            address: string;
            phone?: string | undefined;
            city?: string | undefined;
            neighborhood?: string | undefined;
        } | undefined;
    }, {
        medications: {
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            quantity?: number | undefined;
            lotNumber?: string | undefined;
        }[];
        observations?: string | undefined;
        patientId?: string | undefined;
        priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | undefined;
        documentNumber?: string | undefined;
        scheduledDate?: string | undefined;
        scheduledTime?: string | undefined;
        newPatient?: {
            firstName: string;
            lastName: string;
            documentId: string;
            address: string;
            phone?: string | undefined;
            documentType?: string | undefined;
            city?: string | undefined;
            neighborhood?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
        medications: {
            quantity: number;
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            lotNumber?: string | undefined;
        }[];
        observations?: string | undefined;
        patientId?: string | undefined;
        documentNumber?: string | undefined;
        scheduledDate?: string | undefined;
        scheduledTime?: string | undefined;
        newPatient?: {
            firstName: string;
            lastName: string;
            documentId: string;
            documentType: string;
            address: string;
            phone?: string | undefined;
            city?: string | undefined;
            neighborhood?: string | undefined;
        } | undefined;
    };
}, {
    body: {
        medications: {
            medicationCode: string;
            medicationName: string;
            observations?: string | undefined;
            quantity?: number | undefined;
            lotNumber?: string | undefined;
        }[];
        observations?: string | undefined;
        patientId?: string | undefined;
        priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | undefined;
        documentNumber?: string | undefined;
        scheduledDate?: string | undefined;
        scheduledTime?: string | undefined;
        newPatient?: {
            firstName: string;
            lastName: string;
            documentId: string;
            address: string;
            phone?: string | undefined;
            documentType?: string | undefined;
            city?: string | undefined;
            neighborhood?: string | undefined;
        } | undefined;
    };
}>;
