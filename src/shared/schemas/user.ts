import { z } from 'zod';
import { UserStatus, UserRole } from './common';

// User schemas
export const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  password: z.string().min(8).max(100),
  role: z.nativeEnum(UserRole).default(UserRole.STUDENT),
});

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
  preferences: z.record(z.any()).optional(),
});

export const UserResponseSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().url().nullable(),
  status: z.nativeEnum(UserStatus),
  role: z.nativeEnum(UserRole),
  lastLoginAt: z.string().datetime().nullable(),
  preferences: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UserStatsSchema = z.object({
  totalSubmissions: z.number().int().min(0),
  approvedSubmissions: z.number().int().min(0),
  totalScore: z.number().min(0),
  averageScore: z.number().min(0),
  rank: z.number().int().min(1),
  badges: z.number().int().min(0),
  streak: z.number().int().min(0),
});

// Type exports
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;

// DTO exports for API compatibility
export type UserProfile = UserResponse;