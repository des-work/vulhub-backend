import { z } from 'zod';

// Common validation schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const SearchSchema = z.object({
  query: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const TimeRangeSchema = z.enum(['week', 'month', 'all']).default('all');

// Common response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Common enums
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN',
}

export enum SubmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ProjectDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum ProjectCategory {
  WEB_APPLICATION = 'WEB_APPLICATION',
  NETWORK = 'NETWORK',
  CRYPTOGRAPHY = 'CRYPTOGRAPHY',
  FORENSICS = 'FORENSICS',
  REVERSE_ENGINEERING = 'REVERSE_ENGINEERING',
  BINARY_EXPLOITATION = 'BINARY_EXPLOITATION',
  MOBILE = 'MOBILE',
  IOT = 'IOT',
  CLOUD = 'CLOUD',
  SOCIAL_ENGINEERING = 'SOCIAL_ENGINEERING',
}