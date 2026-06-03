import { z } from 'zod';
import { UserStatus } from '@prisma/client';

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
    search: z.string().optional(),
    status: z.nativeEnum(UserStatus).optional(),
    roleId: z.string().cuid().optional(),
  }),
});

export const userIdSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
});

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    documentId: z.string().optional(),
    roleId: z.string().cuid(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    email: z.string().email().optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
    documentId: z.string().optional(),
    roleId: z.string().cuid().optional(),
    status: z.nativeEnum(UserStatus).optional(),
  }),
});

export const resetPasswordSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    password: z.string().min(8),
  }),
});

export const changeStatusSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    status: z.nativeEnum(UserStatus),
  }),
});
