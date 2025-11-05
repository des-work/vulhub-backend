import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

export interface EnvironmentValidationResult {
  isValid: boolean;
  errors: EnvironmentValidationError[];
  warnings: EnvironmentValidationWarning[];
  recommendations: string[];
}

export interface EnvironmentValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface EnvironmentValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

@Injectable()
export class EnvironmentValidator implements OnModuleInit {
  private readonly logger = new Logger(EnvironmentValidator.name);
  private validationResult: EnvironmentValidationResult;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.validationResult = await this.validateEnvironment();
    this.logValidationResults();

    if (!this.validationResult.isValid) {
      const criticalErrors = this.validationResult.errors.filter(e => e.severity === 'critical');
      if (criticalErrors.length > 0) {
        this.logger.error(`🚨 Critical environment validation errors found: ${criticalErrors.length}`);
        throw new Error(`Environment validation failed with ${criticalErrors.length} critical errors`);
      }
    }
  }

  async validateEnvironment(): Promise<EnvironmentValidationResult> {
    const errors: EnvironmentValidationError[] = [];
    const warnings: EnvironmentValidationWarning[] = [];
    const recommendations: string[] = [];

    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    // Core application validation
    await this.validateCoreApplication(errors, warnings, recommendations, isProduction);

    // Database validation
    await this.validateDatabase(errors, warnings, recommendations, isProduction);

    // Redis validation
    await this.validateRedis(errors, warnings, recommendations, isProduction);

    // Security validation
    this.validateSecurity(errors, warnings, recommendations, isProduction);

    // External services validation
    await this.validateExternalServices(errors, warnings, recommendations, isProduction);

    // Performance validation
    this.validatePerformance(errors, warnings, recommendations, isProduction);

    const isValid = errors.filter(e => e.severity === 'critical').length === 0;

    return {
      isValid,
      errors,
      warnings,
      recommendations,
    };
  }

  private async validateCoreApplication(
    errors: EnvironmentValidationError[],
    warnings: EnvironmentValidationWarning[],
    recommendations: string[],
    isProduction: boolean
  ): Promise<void> {
    // PORT validation
    const port = process.env.PORT;
    if (isProduction && !port) {
      errors.push({
        field: 'PORT',
        message: 'PORT is required in production',
        severity: 'critical',
        suggestion: 'Set PORT environment variable (e.g., 4000)',
      });
    } else if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
      errors.push({
        field: 'PORT',
        message: `Invalid PORT value: ${port}`,
        severity: 'high',
        suggestion: 'Set PORT to a valid number between 1-65535',
      });
    }

    // CORS_ORIGIN validation
    const corsOrigin = process.env.CORS_ORIGIN;
    if (isProduction && !corsOrigin) {
      errors.push({
        field: 'CORS_ORIGIN',
        message: 'CORS_ORIGIN is required in production',
        severity: 'critical',
        suggestion: 'Set CORS_ORIGIN to your frontend domain(s)',
      });
    } else if (corsOrigin && !this.isValidCorsOrigin(corsOrigin)) {
      warnings.push({
        field: 'CORS_ORIGIN',
        message: `CORS_ORIGIN format may be invalid: ${corsOrigin}`,
        suggestion: 'Use format like "https://yourdomain.com" or "https://yourdomain.com,https://app.yourdomain.com"',
      });
    }

    // NODE_ENV validation
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (!['development', 'production', 'test'].includes(nodeEnv)) {
      warnings.push({
        field: 'NODE_ENV',
        message: `Unusual NODE_ENV value: ${nodeEnv}`,
        suggestion: 'Use "development", "production", or "test"',
      });
    }
  }

  private async validateDatabase(
    errors: EnvironmentValidationError[],
    warnings: EnvironmentValidationWarning[],
    recommendations: string[],
    isProduction: boolean
  ): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (isProduction && !databaseUrl) {
      errors.push({
        field: 'DATABASE_URL',
        message: 'DATABASE_URL is required in production',
        severity: 'critical',
        suggestion: 'Set DATABASE_URL to your PostgreSQL connection string',
      });
    } else if (databaseUrl) {
      // Validate database URL format
      if (!this.isValidDatabaseUrl(databaseUrl)) {
        errors.push({
          field: 'DATABASE_URL',
          message: 'DATABASE_URL format is invalid',
          severity: 'high',
          suggestion: 'Use format: postgresql://username:password@host:port/database',
        });
      } else {
        // Test database connection
        try {
          await this.testDatabaseConnection(databaseUrl);
        } catch (error) {
          const severity = isProduction ? 'critical' : 'high';
          errors.push({
            field: 'DATABASE_URL',
            message: `Database connection failed: ${error.message}`,
            severity,
            suggestion: 'Check database credentials and network connectivity',
          });
        }
      }
    }

    // Connection pool settings
    const maxConnections = process.env.DATABASE_MAX_CONNECTIONS;
    if (maxConnections && (isNaN(Number(maxConnections)) || Number(maxConnections) < 1)) {
      warnings.push({
        field: 'DATABASE_MAX_CONNECTIONS',
        message: `Invalid DATABASE_MAX_CONNECTIONS: ${maxConnections}`,
        suggestion: 'Set to a positive number (default: 10)',
      });
    }

    const connectionTimeout = process.env.DATABASE_CONNECTION_TIMEOUT;
    if (connectionTimeout && (isNaN(Number(connectionTimeout)) || Number(connectionTimeout) < 1000)) {
      warnings.push({
        field: 'DATABASE_CONNECTION_TIMEOUT',
        message: `DATABASE_CONNECTION_TIMEOUT too low: ${connectionTimeout}ms`,
        suggestion: 'Set to at least 1000ms (default: 30000ms)',
      });
    }
  }

  private async validateRedis(
    errors: EnvironmentValidationError[],
    warnings: EnvironmentValidationWarning[],
    recommendations: string[],
    isProduction: boolean
  ): Promise<void> {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';

    if (isProduction && !process.env.REDIS_HOST) {
      warnings.push({
        field: 'REDIS_HOST',
        message: 'REDIS_HOST not set in production, using localhost',
        suggestion: 'Set REDIS_HOST to your Redis server address',
      });
    }

    if (redisPort && (isNaN(Number(redisPort)) || Number(redisPort) < 1 || Number(redisPort) > 65535)) {
      errors.push({
        field: 'REDIS_PORT',
        message: `Invalid REDIS_PORT: ${redisPort}`,
        severity: 'high',
        suggestion: 'Set REDIS_PORT to a valid port number (default: 6379)',
      });
    }

    // Test Redis connection if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      try {
        await this.testRedisConnection(redisHost, Number(redisPort));
      } catch (error) {
        const severity = isProduction ? 'high' : 'medium';
        errors.push({
          field: 'REDIS_CONNECTION',
          message: `Redis connection failed: ${error.message}`,
          severity,
          suggestion: 'Check Redis server is running and accessible',
        });
      }
    }

    // Redis key prefix validation
    const keyPrefix = process.env.REDIS_KEY_PREFIX;
    if (keyPrefix && !keyPrefix.endsWith(':')) {
      warnings.push({
        field: 'REDIS_KEY_PREFIX',
        message: 'REDIS_KEY_PREFIX should end with ":"',
        suggestion: 'Set REDIS_KEY_PREFIX to "vulhub:" or similar',
      });
    }
  }

  private validateSecurity(
    errors: EnvironmentValidationError[],
    warnings: EnvironmentValidationWarning[],
    recommendations: string[],
    isProduction: boolean
  ): void {
    // JWT secrets validation
    const jwtSecret = process.env.JWT_SECRET;
    if (isProduction && (!jwtSecret || jwtSecret === 'dev-jwt-secret-key-change-in-production')) {
      errors.push({
        field: 'JWT_SECRET',
        message: 'JWT_SECRET must be set to a secure value in production',
        severity: 'critical',
        suggestion: 'Generate a secure random string for JWT_SECRET (min 32 characters)',
      });
    } else if (jwtSecret && jwtSecret.length < 32) {
      errors.push({
        field: 'JWT_SECRET',
        message: 'JWT_SECRET is too short for security',
        severity: 'high',
        suggestion: 'Use at least 32 characters for JWT_SECRET',
      });
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (isProduction && (!jwtRefreshSecret || jwtRefreshSecret === 'dev-refresh-secret-key-change-in-production')) {
      errors.push({
        field: 'JWT_REFRESH_SECRET',
        message: 'JWT_REFRESH_SECRET must be set to a secure value in production',
        severity: 'critical',
        suggestion: 'Generate a secure random string for JWT_REFRESH_SECRET (min 32 characters)',
      });
    }

    // Session secret validation
    const sessionSecret = process.env.SESSION_SECRET;
    if (isProduction && !sessionSecret) {
      warnings.push({
        field: 'SESSION_SECRET',
        message: 'SESSION_SECRET not set in production',
        suggestion: 'Set SESSION_SECRET for additional security layer',
      });
    }

    // Bcrypt rounds validation
    const bcryptRounds = process.env.BCRYPT_ROUNDS;
    if (bcryptRounds && (isNaN(Number(bcryptRounds)) || Number(bcryptRounds) < 8)) {
      errors.push({
        field: 'BCRYPT_ROUNDS',
        message: `BCRYPT_ROUNDS too low: ${bcryptRounds}`,
        severity: 'medium',
        suggestion: 'Set BCRYPT_ROUNDS to at least 8 (default: 12)',
      });
    }
  }

  private async validateExternalServices(
    errors: EnvironmentValidationError[],
    warnings: EnvironmentValidationWarning[],
    recommendations: string[],
    isProduction: boolean
  ): Promise<void> {
    // Email configuration validation
    const smtpHost = process.env.SMTP_HOST;
    if (isProduction && !smtpHost) {
      warnings.push({
        field: 'SMTP_HOST',
        message: 'Email functionality may not work without SMTP configuration',
        suggestion: 'Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS for email features',
      });
    }

    // Storage configuration validation
    const storageProvider = process.env.STORAGE_PROVIDER || 'minio';
    if (storageProvider === 'minio') {
      const requiredMinioVars = ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'];
      const missingMinioVars = requiredMinioVars.filter(varName => !process.env[varName]);

      if (missingMinioVars.length > 0) {
        warnings.push({
          field: 'MINIO_CONFIG',
          message: `Missing MinIO configuration: ${missingMinioVars.join(', ')}`,
          suggestion: 'Configure MinIO for file storage or set STORAGE_PROVIDER to another provider',
        });
      }
    }

    // OIDC validation
    const oidcIssuer = process.env.OIDC_ISSUER;
    if (oidcIssuer && !this.isValidUrl(oidcIssuer)) {
      errors.push({
        field: 'OIDC_ISSUER',
        message: `Invalid OIDC_ISSUER URL: ${oidcIssuer}`,
        severity: 'medium',
        suggestion: 'OIDC_ISSUER must be a valid HTTPS URL',
      });
    }
  }

  private validatePerformance(
    errors: EnvironmentValidationError[],
    warnings: EnvironmentValidationWarning[],
    recommendations: string[],
    isProduction: boolean
  ): void {
    // Rate limiting validation
    const rateLimitMax = process.env.RATE_LIMIT_MAX;
    if (rateLimitMax && (isNaN(Number(rateLimitMax)) || Number(rateLimitMax) < 1)) {
      warnings.push({
        field: 'RATE_LIMIT_MAX',
        message: `Invalid RATE_LIMIT_MAX: ${rateLimitMax}`,
        suggestion: 'Set RATE_LIMIT_MAX to a positive number',
      });
    }

    const rateLimitTtl = process.env.RATE_LIMIT_TTL;
    if (rateLimitTtl && (isNaN(Number(rateLimitTtl)) || Number(rateLimitTtl) < 1000)) {
      warnings.push({
        field: 'RATE_LIMIT_TTL',
        message: `RATE_LIMIT_TTL too low: ${rateLimitTtl}ms`,
        suggestion: 'Set RATE_LIMIT_TTL to at least 1000ms',
      });
    }

    // Upload limits validation
    const maxFileSize = process.env.MAX_FILE_SIZE;
    if (maxFileSize && (isNaN(Number(maxFileSize)) || Number(maxFileSize) <= 0)) {
      warnings.push({
        field: 'MAX_FILE_SIZE',
        message: `Invalid MAX_FILE_SIZE: ${maxFileSize}`,
        suggestion: 'Set MAX_FILE_SIZE to a positive number in bytes',
      });
    }
  }

  private isValidCorsOrigin(origin: string): boolean {
    const origins = origin.split(',').map(o => o.trim());
    return origins.every(o => {
      try {
        const url = new URL(o);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    });
  }

  private isValidDatabaseUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
    } catch {
      return false;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async testDatabaseConnection(databaseUrl: string): Promise<void> {
    // Import PrismaClient dynamically to avoid circular dependencies
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasourceUrl: databaseUrl,
    });

    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async testRedisConnection(host: string, port: number): Promise<void> {
    // Skip Redis connection testing since we use MemoryCacheService
    // Redis is optional in this deployment
    this.logger.debug(`Skipping Redis connection test (using MemoryCacheService instead)`);
  }

  private logValidationResults(): void {
    const { isValid, errors, warnings, recommendations } = this.validationResult;

    if (isValid) {
      this.logger.log('✅ Environment validation passed');
    } else {
      this.logger.error(`❌ Environment validation failed with ${errors.length} errors`);
    }

    if (errors.length > 0) {
      errors.forEach(error => {
        const level = error.severity === 'critical' ? 'error' : 'warn';
        this.logger[level](`🔴 ${error.field}: ${error.message}`);
        this.logger[level](`   💡 Suggestion: ${error.suggestion}`);
      });
    }

    if (warnings.length > 0) {
      warnings.forEach(warning => {
        this.logger.warn(`🟡 ${warning.field}: ${warning.message}`);
        this.logger.warn(`   💡 Suggestion: ${warning.suggestion}`);
      });
    }

    if (recommendations.length > 0) {
      recommendations.forEach(rec => {
        this.logger.log(`💡 ${rec}`);
      });
    }
  }

  getValidationResult(): EnvironmentValidationResult {
    return this.validationResult;
  }

  isEnvironmentValid(): boolean {
    return this.validationResult.isValid;
  }

  getCriticalErrors(): EnvironmentValidationError[] {
    return this.validationResult.errors.filter(e => e.severity === 'critical');
  }

  getWarnings(): EnvironmentValidationWarning[] {
    return this.validationResult.warnings;
  }
}
