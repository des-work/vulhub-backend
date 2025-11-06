import { z } from 'zod';

// Authentication schemas
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  tenantId: z.string().cuid(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().cuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().url().nullable(),
    role: z.string(),
    tenantId: z.string().cuid(),
  }),
});

// Health check schemas
export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'error']),
  timestamp: z.string().datetime(),
  uptime: z.number().min(0),
  environment: z.string(),
  version: z.string(),
  services: z.object({
    database: z.object({
      status: z.enum(['up', 'down']),
      responseTime: z.number().min(0),
    }),
    redis: z.object({
      status: z.enum(['up', 'down']),
      responseTime: z.number().min(0),
    }),
  }),
});

// Error response schemas
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  statusCode: z.number().int().min(100).max(599),
  timestamp: z.string().datetime(),
  path: z.string(),
  method: z.string(),
  error: z.string(),
  message: z.union([z.string(), z.array(z.string())]),
  stack: z.string().optional(),
});

// Type exports
export type LoginCredentials = z.infer<typeof LoginSchema>;
export type RegisterCredentials = z.infer<typeof RegisterSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// DTO exports for API compatibility
export type LoginDto = LoginCredentials;
export type RegisterDto = RegisterCredentials;
export type RefreshTokenDto = RefreshTokenRequest;