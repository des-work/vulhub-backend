export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// User Domain Errors
export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`, 'USER_NOT_FOUND', 404);
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(`User with email ${email} already exists`, 'USER_ALREADY_EXISTS', 409);
  }
}

export class InvalidUserCredentialsError extends DomainError {
  constructor() {
    super('Invalid user credentials', 'INVALID_CREDENTIALS', 401);
  }
}

export class UserInactiveError extends DomainError {
  constructor(userId: string) {
    super(`User ${userId} is inactive`, 'USER_INACTIVE', 403);
  }
}

// Project Domain Errors
export class ProjectNotFoundError extends DomainError {
  constructor(projectId: string) {
    super(`Project with ID ${projectId} not found`, 'PROJECT_NOT_FOUND', 404);
  }
}

export class ProjectInactiveError extends DomainError {
  constructor(projectId: string) {
    super(`Project ${projectId} is inactive`, 'PROJECT_INACTIVE', 403);
  }
}

export class ProjectNotPublicError extends DomainError {
  constructor(projectId: string) {
    super(`Project ${projectId} is not public`, 'PROJECT_NOT_PUBLIC', 403);
  }
}

// Submission Domain Errors
export class SubmissionNotFoundError extends DomainError {
  constructor(submissionId: string) {
    super(`Submission with ID ${submissionId} not found`, 'SUBMISSION_NOT_FOUND', 404);
  }
}

export class SubmissionAlreadyReviewedError extends DomainError {
  constructor(submissionId: string) {
    super(`Submission ${submissionId} has already been reviewed`, 'SUBMISSION_ALREADY_REVIEWED', 409);
  }
}

export class InvalidSubmissionStatusError extends DomainError {
  constructor(currentStatus: string, attemptedStatus: string) {
    super(`Cannot change submission status from ${currentStatus} to ${attemptedStatus}`, 'INVALID_STATUS_TRANSITION', 400);
  }
}

// Badge Domain Errors
export class BadgeNotFoundError extends DomainError {
  constructor(badgeId: string) {
    super(`Badge with ID ${badgeId} not found`, 'BADGE_NOT_FOUND', 404);
  }
}

export class BadgeAlreadyEarnedError extends DomainError {
  constructor(userId: string, badgeId: string) {
    super(`User ${userId} has already earned badge ${badgeId}`, 'BADGE_ALREADY_EARNED', 409);
  }
}

export class BadgeNotEarnedError extends DomainError {
  constructor(userId: string, badgeId: string) {
    super(`User ${userId} has not earned badge ${badgeId}`, 'BADGE_NOT_EARNED', 400);
  }
}

// Leaderboard Domain Errors
export class LeaderboardNotFoundError extends DomainError {
  constructor() {
    super(`Leaderboard not found`, 'LEADERBOARD_NOT_FOUND', 404);
  }
}

export class InvalidLeaderboardTypeError extends DomainError {
  constructor(leaderboardType: string) {
    super(`Invalid leaderboard type: ${leaderboardType}`, 'INVALID_LEADERBOARD_TYPE', 400);
  }
}

// Validation Errors
export class ValidationError extends DomainError {
  constructor(field: string, message: string) {
    super(`Validation error for field ${field}: ${message}`, 'VALIDATION_ERROR', 400);
  }
}

export class RequiredFieldError extends DomainError {
  constructor(field: string) {
    super(`Required field ${field} is missing`, 'REQUIRED_FIELD_MISSING', 400);
  }
}

export class InvalidFormatError extends DomainError {
  constructor(field: string, format: string) {
    super(`Field ${field} must be in format ${format}`, 'INVALID_FORMAT', 400);
  }
}

// Business Logic Errors
export class BusinessRuleViolationError extends DomainError {
  constructor(rule: string, message: string) {
    super(`Business rule violation: ${rule} - ${message}`, 'BUSINESS_RULE_VIOLATION', 400);
  }
}

export class InsufficientPermissionsError extends DomainError {
  constructor(action: string) {
    super(`Insufficient permissions to perform ${action}`, 'INSUFFICIENT_PERMISSIONS', 403);
  }
}

export class ResourceLimitExceededError extends DomainError {
  constructor(resource: string, limit: number) {
    super(`Resource limit exceeded for ${resource}: ${limit}`, 'RESOURCE_LIMIT_EXCEEDED', 429);
  }
}

// System Errors
export class ExternalServiceError extends DomainError {
  constructor(service: string, message: string) {
    super(`External service ${service} error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502);
  }
}

export class DatabaseConnectionError extends DomainError {
  constructor() {
    super('Database connection failed', 'DATABASE_CONNECTION_ERROR', 503);
  }
}

export class CacheConnectionError extends DomainError {
  constructor() {
    super('Cache connection failed', 'CACHE_CONNECTION_ERROR', 503);
  }
}
