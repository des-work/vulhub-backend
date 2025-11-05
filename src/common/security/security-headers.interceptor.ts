import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    // Set security headers
    this.setSecurityHeaders(response);

    return next.handle().pipe(
      map(data => {
        // Additional security measures can be applied here
        return data;
      })
    );
  }

  /**
   * Set comprehensive security headers
   */
  private setSecurityHeaders(response: any): void {
    // Content Security Policy
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' wss: ws:; " +
      "frame-src 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none'; " +
      "upgrade-insecure-requests"
    );

    // X-Frame-Options
    response.setHeader('X-Frame-Options', 'DENY');

    // X-Content-Type-Options
    response.setHeader('X-Content-Type-Options', 'nosniff');

    // X-XSS-Protection
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
    );

    // Strict-Transport-Security (HSTS)
    response.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // Cross-Origin Policies
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    // Cache Control for sensitive endpoints
    if (this.isSensitiveEndpoint(response.req?.url)) {
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
    }

    // Remove server information
    response.removeHeader('X-Powered-By');
    response.removeHeader('Server');
  }

  /**
   * Check if endpoint is sensitive
   */
  private isSensitiveEndpoint(url: string): boolean {
    const sensitivePaths = [
      '/auth/login',
      '/auth/register',
      '/auth/logout',
      '/auth/refresh',
      '/users/profile',
      '/users/password',
    ];

    return sensitivePaths.some(path => url.includes(path));
  }
}
