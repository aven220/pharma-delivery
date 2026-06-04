"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeStatusSchema = exports.resetPasswordSchema = exports.updateUserSchema = exports.createUserSchema = exports.userIdSchema = exports.listUsersSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.listUsersSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().default(1),
        limit: zod_1.z.coerce.number().default(20),
        search: zod_1.z.string().optional(),
        status: zod_1.z.nativeEnum(client_1.UserStatus).optional(),
        roleId: zod_1.z.string().cuid().optional(),
    }),
});
exports.userIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
});
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8),
        firstName: zod_1.z.string().min(1),
        lastName: zod_1.z.string().min(1),
        phone: zod_1.z.string().optional(),
        documentId: zod_1.z.string().optional(),
        roleId: zod_1.z.string().cuid(),
    }),
});
exports.updateUserSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
    body: zod_1.z.object({
        email: zod_1.z.string().email().optional(),
        firstName: zod_1.z.string().min(1).optional(),
        lastName: zod_1.z.string().min(1).optional(),
        phone: zod_1.z.string().optional(),
        documentId: zod_1.z.string().optional(),
        roleId: zod_1.z.string().cuid().optional(),
        status: zod_1.z.nativeEnum(client_1.UserStatus).optional(),
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
    body: zod_1.z.object({
        password: zod_1.z.string().min(8),
    }),
});
exports.changeStatusSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
    body: zod_1.z.object({
        status: zod_1.z.nativeEnum(client_1.UserStatus),
    }),
});
