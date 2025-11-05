/**
 * Type definitions for string-based enums
 * SQLite doesn't support native enums, so we use string types with constants
 */

export const UserStatusEnum = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type UserStatus = typeof UserStatusEnum[keyof typeof UserStatusEnum];

export const UserRoleEnum = {
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = typeof UserRoleEnum[keyof typeof UserRoleEnum];

export const SubmissionStatusEnum = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type SubmissionStatus = typeof SubmissionStatusEnum[keyof typeof SubmissionStatusEnum];

// Utility function to validate enum values
export function isValidUserStatus(value: any): value is UserStatus {
  return Object.values(UserStatusEnum).includes(value);
}

export function isValidUserRole(value: any): value is UserRole {
  return Object.values(UserRoleEnum).includes(value);
}

export function isValidSubmissionStatus(value: any): value is SubmissionStatus {
  return Object.values(SubmissionStatusEnum).includes(value);
}
