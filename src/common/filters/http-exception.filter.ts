import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ErrorHandlerService, ErrorContext } from '../errors/error-handler.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly errorHandler: ErrorHandlerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract context information for error reporting
    const errorContext: ErrorContext = {
      operation: `${request.method} ${request.route?.path || request.url}`,
      resource: request.route?.path,
      metadata: {
        userAgent: request.get('User-Agent'),
        ip: request.ip || request.connection?.remoteAddress,
        query: request.query,
        body: this.sanitizeBody(request.body),
        params: request.params,
      },
    };

    let status: number;
    let message: string | object;
    let error: string;
    let userFriendlyMessage: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
        userFriendlyMessage = exceptionResponse;
      } else {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
        
        // Type-safe message handling
        if (Array.isArray(message)) {
          userFriendlyMessage = message.join(', ');
        } else if (typeof message === 'string') {
          userFriendlyMessage = message;
        } else if (typeof message === 'object' && message !== null) {
          userFriendlyMessage = JSON.stringify(message);
        } else {
          userFriendlyMessage = String(message || 'An error occurred');
        }
      }
    } else if (exception && typeof exception === 'object' && 'code' in exception) {
      // Handle Prisma errors
      const prismaError = exception as any;
      const errorInfo = this.handlePrismaError(prismaError);
      status = errorInfo.status;
      message = errorInfo.message;
      error = errorInfo.error;
      userFriendlyMessage = errorInfo.userFriendlyMessage;
    } else if (exception instanceof Error) {
      // Handle generic errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      error = 'Internal Server Error';
      userFriendlyMessage = this.errorHandler.createUserFriendlyMessage(exception);
    } else {
      // Handle unknown errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Internal Server Error';
      userFriendlyMessage = 'An unexpected error occurred. Please try again later.';
    }

    // Create comprehensive error report
    const errorReport = this.errorHandler.handleError(
      exception instanceof Error ? exception : new Error(String(exception)),
      errorContext
    );

    // Determine if we should include detailed error info
    const isDevelopment = process.env.NODE_ENV === 'development';
    const shouldIncludeDetails = isDevelopment || errorReport.severity === 'critical';

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message: userFriendlyMessage,
      ...(shouldIncludeDetails && {
        details: message,
        severity: errorReport.severity,
      }),
      ...(isDevelopment && {
        stack: exception instanceof Error ? exception.stack : undefined,
        context: errorContext,
      }),
      ...(status === HttpStatus.TOO_MANY_REQUESTS && {
        retryAfter: this.extractRetryAfter(request),
      }),
    };

    // Log error with appropriate level
    const logLevel = this.getLogLevel(errorReport.severity);
    this.logger[logLevel](
      `HTTP ${status} Error: ${userFriendlyMessage}`,
      {
        statusCode: status,
        path: request.url,
        method: request.method,
        severity: errorReport.severity,
        userId: errorContext.userId,
        tenantId: errorContext.tenantId,
        ...(isDevelopment && {
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      }
    );

    response.status(status).json(errorResponse);
  }

  private handlePrismaError(exception: any): {
    status: number;
    message: string;
    error: string;
    userFriendlyMessage: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: `Unique constraint violation: ${exception.meta?.target || 'unknown field'}`,
          error: 'Conflict',
          userFriendlyMessage: 'A record with this information already exists',
        };
      case 'P2025':
      case 'P2001':
        return {
          status: HttpStatus.NOT_FOUND,
          message: `Record not found: ${exception.meta?.modelName || 'unknown model'}`,
          error: 'Not Found',
          userFriendlyMessage: 'The requested resource was not found',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Foreign key constraint failed: ${exception.meta?.field_name || 'unknown field'}`,
          error: 'Bad Request',
          userFriendlyMessage: 'Invalid reference to related data',
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Invalid ID provided: ${exception.meta?.target || 'unknown target'}`,
          error: 'Bad Request',
          userFriendlyMessage: 'Invalid ID provided',
        };
      case 'P2016':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Query interpretation error',
          error: 'Bad Request',
          userFriendlyMessage: 'Invalid query parameters',
        };
      case 'P1001':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database connection refused',
          error: 'Service Unavailable',
          userFriendlyMessage: 'Database temporarily unavailable',
        };
      case 'P1008':
        return {
          status: HttpStatus.REQUEST_TIMEOUT,
          message: 'Database connection timeout',
          error: 'Request Timeout',
          userFriendlyMessage: 'Request timed out. Please try again.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Database operation failed: ${exception.code}`,
          error: 'Internal Server Error',
          userFriendlyMessage: 'A database operation failed. Please try again.',
        };
    }
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private extractRetryAfter(request: Request): number {
    // Extract retry-after from rate limiting guard if available
    // This would be set by the rate limit guard
    return 60; // Default 60 seconds
  }

  private getLogLevel(severity: 'low' | 'medium' | 'high' | 'critical'): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
      default:
        return 'log';
    }
  }
}
