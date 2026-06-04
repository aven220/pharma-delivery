import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
    }, {
        email: string;
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        password: string;
    };
}, {
    body: {
        email: string;
        password: string;
    };
}>;
export declare const refreshSchema: z.ZodObject<{
    body: z.ZodObject<{
        refreshToken: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        refreshToken: string;
    }, {
        refreshToken: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        refreshToken: string;
    };
}, {
    body: {
        refreshToken: string;
    };
}>;
export declare const logoutSchema: z.ZodObject<{
    body: z.ZodObject<{
        refreshToken: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        refreshToken: string;
    }, {
        refreshToken: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        refreshToken: string;
    };
}, {
    body: {
        refreshToken: string;
    };
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
    }, {
        email: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
    };
}, {
    body: {
        email: string;
    };
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        token: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        token: string;
        password: string;
    }, {
        token: string;
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        token: string;
        password: string;
    };
}, {
    body: {
        token: string;
        password: string;
    };
}>;
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        roleId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        firstName: string;
        lastName: string;
        roleId: string;
        password: string;
        phone?: string | undefined;
    }, {
        email: string;
        firstName: string;
        lastName: string;
        roleId: string;
        password: string;
        phone?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        firstName: string;
        lastName: string;
        roleId: string;
        password: string;
        phone?: string | undefined;
    };
}, {
    body: {
        email: string;
        firstName: string;
        lastName: string;
        roleId: string;
        password: string;
        phone?: string | undefined;
    };
}>;
