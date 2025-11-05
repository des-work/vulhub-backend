import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private requestCount = 0;
  private errorCount = 0;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const requestId = this.generateRequestId();

    // Increment request counter
    this.requestCount++;

    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = (request as any).user?.id;
    const contentLength = request.get('content-length') || '0';

    const startTime = Date.now();

    // Log incoming request
    this.logger.log(
      `→ ${method} ${url} [${requestId}] - ${this.getClientIP(request)} - ${userAgent} ${
        tenantId ? `[tenant: ${tenantId}]` : ''
      } ${userId ? `[user: ${userId}]` : ''} ${contentLength}B`,
      {
        requestId,
        method,
        url,
        headers: this.sanitizeHeaders(request.headers),
        query: request.query,
        body: this.shouldLogBody(method, url) ? this.sanitizeBody(request.body) : '[BODY LOGGING DISABLED]',
      }
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;
          const responseSize = this.getResponseSize(data);

          // Determine log level based on status
          const logLevel = this.getLogLevel(statusCode);

          this.logger[logLevel](
            `← ${method} ${url} ${statusCode} ${duration}ms ${responseSize}B [${requestId}]`,
            statusCode >= 400 ? {
              requestId,
              duration,
              statusCode,
              responseSize,
              error: data?.message || 'Unknown error',
            } : undefined
          );

          // Update response headers
          response.set({
            'X-Request-ID': requestId,
            'X-Response-Time': `${duration}ms`,
          });
        },
      }),
      catchError((error) => {
        this.errorCount++;
        const duration = Date.now() - startTime;
        const statusCode = error.status || error.statusCode || 500;

        this.logger.error(
          `✗ ${method} ${url} ${statusCode} ${duration}ms [${requestId}] - ${error.message}`,
          {
            requestId,
            duration,
            statusCode,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
              code: error.code,
            },
            request: {
              ip: this.getClientIP(request),
              userAgent,
              tenantId,
              userId,
              headers: this.sanitizeHeaders(request.headers),
              query: request.query,
            },
          }
        );

        // Update response headers even for errors
        response.set({
          'X-Request-ID': requestId,
          'X-Response-Time': `${duration}ms`,
        });

        return throwError(() => error);
      })
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(request: Request): string {
    const forwarded = request.get('x-forwarded-for');
    const realIP = request.get('x-real-ip');
    const cfConnectingIP = request.get('cf-connecting-ip');

    if (cfConnectingIP) return cfConnectingIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    if (realIP) return realIP;

    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'creditCard', 'ssn'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeBody(sanitized[key]);
      }
    });

    return sanitized;
  }

  private shouldLogBody(method: string, url: string): boolean {
    // Don't log bodies for sensitive endpoints
    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      return false;
    }

    // Don't log large bodies
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      return process.env.NODE_ENV === 'development';
    }

    return false;
  }

  private getResponseSize(data: any): string {
    try {
      if (data === null || data === undefined) return '0';
      if (typeof data === 'string') return `${data.length}`;
      return `${JSON.stringify(data).length}`;
    } catch {
      return 'unknown';
    }
  }

  private getLogLevel(statusCode: number): 'log' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'log';
  }

  /**
   * Get request logging statistics for monitoring
   */
  getLoggingStats(): {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
  } {
    return {
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
    };
  }
}
