import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { MemoryCacheService } from '../../adapters/cache/memory-cache.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private cacheService: MemoryCacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const ip = this.getClientIP(request);
    const endpoint = request.route?.path || request.url;
    const method = request.method;
    const userId = request.user?.id; // If user is authenticated

    // Different rate limits for different scenarios
    const limits = this.getRateLimit(endpoint, method, userId);

    // Use user ID for authenticated requests, IP for anonymous
    const identifier = userId || ip;
    const key = `rate_limit:${identifier}:${endpoint}`;

    try {
      const current = await this.cacheService.get(key);
      const count = current ? parseInt(current) : 0;

      // Set rate limit headers
      this.setRateLimitHeaders(response, count, limits);

      if (count >= limits.max) {
        // Log rate limit violation
        this.logger.warn(
          `Rate limit exceeded for ${identifier} on ${method} ${endpoint}`,
          {
            ip,
            userId,
            endpoint,
            method,
            currentCount: count,
            limit: limits.max,
            window: limits.window,
          }
        );

        // Calculate retry-after in seconds
        const retryAfter = limits.window - await this.getTTL(key);

        throw new HttpException({
          success: false,
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
          limit: limits.max,
          remaining: 0,
          resetTime: new Date(Date.now() + retryAfter * 1000).toISOString(),
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      // Increment counter (first request sets to 1)
      if (count === 0) {
        await this.cacheService.setex(key, limits.window, '1');
      } else {
        await this.cacheService.incr(key);
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Cache error - allow request but log
      this.logger.error(`Cache error in rate limiting: ${error.message}`, {
        ip,
        userId,
        endpoint,
        method,
      });

      // Allow request on cache failure (fail open)
      return true;
    }
  }
  
  private getRateLimit(endpoint: string, method: string, userId?: string): { max: number; window: number } {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isAuthenticated = !!userId;

    // Auth endpoints - stricter limits
    if (endpoint.includes('/auth/login') || endpoint.includes('/auth/register')) {
      return isDevelopment
        ? { max: isAuthenticated ? 20 : 50, window: 900 } // More lenient for authenticated users
        : { max: isAuthenticated ? 10 : 5, window: 900 }; // 5-10 attempts per 15 minutes
    }

    // Password reset endpoints - moderate limits
    if (endpoint.includes('/auth/reset') || endpoint.includes('/auth/forgot')) {
      return isDevelopment
        ? { max: 10, window: 3600 } // 10 requests per hour in dev
        : { max: 3, window: 3600 }; // 3 requests per hour in production
    }

    // File upload endpoints - stricter limits
    if (endpoint.includes('/upload') || method === 'POST' && endpoint.includes('/files')) {
      return isDevelopment
        ? { max: 50, window: 3600 } // 50 uploads per hour in dev
        : { max: 10, window: 3600 }; // 10 uploads per hour in production
    }

    // Write operations (POST, PUT, DELETE) - moderate limits
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      return isDevelopment
        ? { max: isAuthenticated ? 500 : 200, window: 3600 } // Authenticated users get higher limits
        : { max: isAuthenticated ? 100 : 50, window: 3600 };
    }

    // Read operations (GET) - generous limits
    return isDevelopment
      ? { max: isAuthenticated ? 2000 : 1000, window: 3600 }
      : { max: isAuthenticated ? 500 : 200, window: 3600 };
  }

  private getClientIP(request: any): string {
    // Check various headers for the real IP
    const forwarded = request.get('x-forwarded-for');
    const realIP = request.get('x-real-ip');
    const cfConnectingIP = request.get('cf-connecting-ip');

    if (cfConnectingIP) return cfConnectingIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    if (realIP) return realIP;

    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  private setRateLimitHeaders(response: any, currentCount: number, limits: { max: number; window: number }) {
    const remaining = Math.max(0, limits.max - currentCount - 1);

    response.set({
      'X-RateLimit-Limit': limits.max,
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': new Date(Date.now() + limits.window * 1000).toISOString(),
      'X-RateLimit-Window': limits.window,
    });
  }

  private async getTTL(key: string): Promise<number> {
    try {
      const ttl = await this.cacheService.ttl(key);
      return ttl > 0 ? ttl : 0;
    } catch (error) {
      this.logger.warn(`Failed to get TTL for rate limit key: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get rate limiting statistics for monitoring
   */
  async getRateLimitStats(): Promise<{
    totalKeys: number;
    activeLimits: Array<{
      key: string;
      count: number;
      ttl: number;
    }>;
  }> {
    try {
      // In a real implementation, this would scan Redis for rate limit keys
      // For now, return placeholder data
      return {
        totalKeys: 0,
        activeLimits: [],
      };
    } catch (error) {
      this.logger.error(`Failed to get rate limit stats: ${error.message}`);
      return {
        totalKeys: 0,
        activeLimits: [],
      };
    }
  }
}
