import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim(),
    email: z.string().email().toLowerCase(),
    password: z.string().min(6),
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid role ID'),
    phoneNumber: z.string().optional()
  })
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    email: z.string().email().toLowerCase().optional(),
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid role ID').optional(),
    isActive: z.boolean().optional(),
    isBlocked: z.boolean().optional(),
    phoneNumber: z.string().optional(),
    profileImage: z.string().optional(),
    accountLocked: z.boolean().optional()
  })
});

export const searchUsersSchema = z.object({
  body: z.object({
    mongoQuery: z.object({}).passthrough(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(1000).default(10),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    projection: z.object({}).passthrough().optional(),
    search: z.string().optional()
  })
});

export const idSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId')
  })
});