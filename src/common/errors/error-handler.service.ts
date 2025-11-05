import { Injectable, Logger } from '@nestjs/common';
import { 
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError
} from '@prisma/client/runtime/library';
import { DomainError } from './domain-error.base';
import { Prisma } from '@prisma/client';

export interface ErrorContext {
  userId?: string;
  tenantId?: string;
  operation?: string;
  resource?: string;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  error: Error;
  context: ErrorContext;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  shouldNotify: boolean;
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  /**
   * Handle and categorize errors
   */
  handleError(error: Error, context: ErrorContext = {}): ErrorReport {
    const timestamp = new Date();
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let shouldNotify = false;

    // Categorize error severity
    if (error instanceof DomainError) {
      severity = this.getDomainErrorSeverity(error);
      shouldNotify = severity === 'high' || severity === 'critical';
    } else if (error instanceof PrismaClientKnownRequestError) {
      severity = this.getPrismaErrorSeverity(error);
      shouldNotify = severity === 'high' || severity === 'critical';
    } else if (error instanceof PrismaClientUnknownRequestError) {
      severity = 'high';
      shouldNotify = true;
    } else if (error instanceof PrismaClientRustPanicError) {
      severity = 'critical';
      shouldNotify = true;
    } else if (error instanceof PrismaClientInitializationError) {
      severity = 'critical';
      shouldNotify = true;
    } else if (error instanceof PrismaClientValidationError) {
      severity = 'medium';
      shouldNotify = false;
    } else {
      severity = 'medium';
      shouldNotify = false;
    }

    const errorReport: ErrorReport = {
      error,
      context,
      timestamp,
      severity,
      shouldNotify,
    };

    // Log error based on severity
    this.logError(errorReport);

    // Notify if necessary
    if (shouldNotify) {
      this.notifyError(errorReport);
    }

    return errorReport;
  }

  /**
   * Get severity for domain errors
   */
  private getDomainErrorSeverity(error: DomainError): 'low' | 'medium' | 'high' | 'critical' {
    // 4xx errors are generally low to medium severity
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return error.statusCode === 404 ? 'low' : 'medium';
    }
    
    // 5xx errors are high to critical severity
    if (error.statusCode >= 500) {
      return error.statusCode >= 503 ? 'critical' : 'high';
    }

    return 'medium';
  }

  /**
   * Get severity for Prisma errors
   */
  private getPrismaErrorSeverity(error: PrismaClientKnownRequestError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return 'medium';
      case 'P2025': // Record not found
        return 'low';
      case 'P2003': // Foreign key constraint
        return 'medium';
      case 'P2014': // Invalid ID
        return 'low';
      case 'P2001': // Record not found
        return 'low';
      case 'P2016': // Query interpretation error
        return 'high';
      case 'P2017': // Raw query failed
        return 'high';
      default:
        return 'medium';
    }
  }

  /**
   * Log error based on severity
   */
  private logError(errorReport: ErrorReport) {
    const { error, context, severity } = errorReport;
    const logMessage = `Error in ${context.operation || 'unknown operation'}: ${error.message}`;
    const logContext = {
      error: error.name,
      code: error instanceof DomainError ? error.code : undefined,
      statusCode: error instanceof DomainError ? error.statusCode : undefined,
      context,
      stack: error.stack,
    };

    switch (severity) {
      case 'critical':
        this.logger.error(logMessage, logContext);
        break;
      case 'high':
        this.logger.error(logMessage, logContext);
        break;
      case 'medium':
        this.logger.warn(logMessage, logContext);
        break;
      case 'low':
        this.logger.log(logMessage, logContext);
        break;
    }
  }

  /**
   * Notify about critical errors
   */
  private notifyError(errorReport: ErrorReport) {
    const { error, context, severity } = errorReport;
    
    // In a real application, this would send notifications to:
    // - Slack/Discord channels
    // - Email alerts
    // - PagerDuty/OpsGenie
    // - Monitoring systems (DataDog, New Relic, etc.)
    
    this.logger.error(`🚨 CRITICAL ERROR NOTIFICATION 🚨`, {
      severity,
      error: error.message,
      context,
      timestamp: errorReport.timestamp,
    });
  }

  /**
   * Create user-friendly error message
   */
  createUserFriendlyMessage(error: Error): string {
    if (error instanceof DomainError) {
      return error.message;
    }

    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return 'A record with this information already exists';
        case 'P2025':
          return 'The requested record was not found';
        case 'P2003':
          return 'Invalid reference to related record';
        case 'P2014':
          return 'Invalid ID provided';
        default:
          return 'A database operation failed';
      }
    }

    if (error instanceof PrismaClientValidationError) {
      return 'Invalid data provided';
    }

    if (error instanceof PrismaClientInitializationError) {
      return 'Database connection failed';
    }

    // Generic fallback
    return 'An unexpected error occurred';
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics(tenantId?: string, fromDate?: Date, toDate?: Date) {
    // In a real application, this would query error logs from:
    // - Database error log table
    // - Log aggregation service (ELK, Splunk, etc.)
    // - Monitoring system APIs
    
    return {
      totalErrors: 0,
      errorsBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      errorsByType: {},
      recentErrors: [],
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: Error): boolean {
    if (error instanceof DomainError) {
      // Domain errors are generally not retryable
      return false;
    }

    if (error instanceof PrismaClientKnownRequestError) {
      // Some Prisma errors might be retryable
      switch (error.code) {
        case 'P1001': // Connection refused
        case 'P1008': // Connection timeout
          return true;
        default:
          return false;
      }
    }

    if (error instanceof PrismaClientUnknownRequestError) {
      return true; // Unknown errors might be transient
    }

    return false;
  }

  /**
   * Get retry delay for retryable errors
   */
  getRetryDelay(error: Error, attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    return delay;
  }
}
