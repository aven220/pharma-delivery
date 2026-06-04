import { z } from 'zod';
export declare const listUsersSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodNativeEnum<{
            ACTIVE: "ACTIVE";
            INACTIVE: "INACTIVE";
            SUSPENDED: "SUSPENDED";
        }>>;
        roleId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
        search?: string | undefined;
        roleId?: string | undefined;
    }, {
        status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
        search?: string | undefined;
        roleId?: string | undefined;
        limit?: number | undefined;
        page?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        limit: number;
        page: number;
        status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
        search?: string | undefined;
        roleId?: string | undefined;
    };
}, {
    query: {
        status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
        search?: string | undefined;
        roleId?: string | undefined;
        limit?: number | undefined;
        page?: number | undefined;
    };
}>;
export declare const userIdSchema: z.ZodObject<{
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
export declare const createUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        documentId: z.ZodOptional<z.ZodString>;
        roleId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        firstName: string;
        lastName: string;
        roleId: string;
        password: string;
        phone?: string | undefined;
        documentId?: string | undefined;
    }, {
        email: string;
        firstName: string;
        lastName: string;
        roleId: string;
        password: string;
        phone?: string | undefined;
        documentId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        firstName: string;
        lastName: string;
        roleId: string;
        password: string;
        phone?: string | undefined;
        documentId?: string | undefined;
    };
}, {
    body: {
        email: string;
        firstName: string;
        lastName: string;
        roleId: string;
        password: string;
        phone?: string | undefined;
        documentId?: string | undefined;
    };
}>;
export declare const updateUserSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        email: z.ZodOptional<z.ZodString>;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        documentId: z.ZodOptional<z.ZodString>;
        roleId: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodNativeEnum<{
            ACTIVE: "ACTIVE";
            INACTIVE: "INACTIVE";
            SUSPENDED: "SUSPENDED";
        }>>;
    }, "strip", z.ZodTypeAny, {
        status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
        email?: string | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        phone?: string | undefined;
        documentId?: string | undefined;
        roleId?: string | undefined;
    }, {
        status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
        email?: string | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        phone?: string | undefined;
        documentId?: string | undefined;
        roleId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
    };
    body: {
        status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
        email?: string | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        phone?: string | undefined;
        documentId?: string | undefined;
        roleId?: string | undefined;
    };
}, {
    params: {
        id: string;
    };
    body: {
        status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
        email?: string | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        phone?: string | undefined;
        documentId?: string | undefined;
        roleId?: string | undefined;
    };
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
    }, {
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
    };
    body: {
        password: string;
    };
}, {
    params: {
        id: string;
    };
    body: {
        password: string;
    };
}>;
export declare const changeStatusSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        status: z.ZodNativeEnum<{
            ACTIVE: "ACTIVE";
            INACTIVE: "INACTIVE";
            SUSPENDED: "SUSPENDED";
        }>;
    }, "strip", z.ZodTypeAny, {
        status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    }, {
        status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
    };
    body: {
        status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    };
}, {
    params: {
        id: string;
    };
    body: {
        status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    };
}>;
