import { Injectable, Logger } from '@nestjs/common';
import { ValidationError } from '../errors/domain-error.base';

export interface ValidationRule<T = any> {
  field: string;
  validator: (value: any, data: T) => boolean | Promise<boolean>;
  message: string;
  required?: boolean;
}

export interface ValidationSchema<T = any> {
  rules: ValidationRule<T>[];
  sanitizers?: SanitizerRule<T>[];
}

export interface SanitizerRule<T = any> {
  field: string;
  sanitizer: (value: any, data: T) => any;
}

export interface ValidationOptions {
  sanitize?: boolean;
  strict?: boolean;
  stopOnFirstError?: boolean;
}

export interface ValidationResult<T = any> {
  isValid: boolean;
  data: T;
  errors: ValidationError[];
  sanitizedData?: T;
}

@Injectable()
export class EnhancedValidatorService {
  private readonly logger = new Logger(EnhancedValidatorService.name);
  private readonly commonRules = new Map<string, ValidationRule>();

  constructor() {
    this.initializeCommonRules();
  }

  /**
   * Validate and sanitize data according to schema
   */
  async validateAndSanitize<T>(
    data: any,
    schema: ValidationSchema<T>,
    options: ValidationOptions = {}
  ): Promise<ValidationResult<T>> {
    const { sanitize = true, strict = true, stopOnFirstError = false } = options;
    
    const result: ValidationResult<T> = {
      isValid: true,
      data: data as T,
      errors: []
    };

    try {
      // Apply sanitizers first if requested
      if (sanitize && schema.sanitizers) {
        result.sanitizedData = await this.sanitizeData(data, schema.sanitizers);
        result.data = result.sanitizedData;
      }

      // Validate data
      const validationErrors = await this.validateData(result.data, schema.rules, stopOnFirstError);
      
      if (validationErrors.length > 0) {
        result.isValid = false;
        result.errors = validationErrors;
      }

      return result;
    } catch (error) {
      this.logger.error('Validation failed:', error);
      result.isValid = false;
      result.errors = [new ValidationError('validation', 'Validation process failed')];
      return result;
    }
  }

  /**
   * Validate data against common rules
   */
  async validateCommon<T>(
    data: T,
    fields: string[],
    options: ValidationOptions = {}
  ): Promise<ValidationResult<T>> {
    const rules = fields.map(field => this.commonRules.get(field)).filter(Boolean) as ValidationRule<T>[];
    
    const schema: ValidationSchema<T> = { rules };
    return this.validateAndSanitize(data, schema, options);
  }

  /**
   * Register a common validation rule
   */
  registerCommonRule(rule: ValidationRule): void {
    this.commonRules.set(rule.field, rule);
    this.logger.log(`Registered common validation rule for field: ${rule.field}`);
  }

  /**
   * Create validation schema builder
   */
  createSchema<T>(): ValidationSchemaBuilder<T> {
    return new ValidationSchemaBuilder<T>();
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string, options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}): { isValid: boolean; errors: string[] } {
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true
    } = options;

    const errors: string[] = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize string input
   */
  sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHtml(html: string): string {
    // Basic HTML sanitization - in production, use a proper library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  }

  private async validateData<T>(
    data: T,
    rules: ValidationRule<T>[],
    stopOnFirstError: boolean
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      try {
        const fieldValue = this.getNestedValue(data, rule.field);
        
        // Check if field is required
        if (rule.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
          errors.push(new ValidationError(rule.field, `${rule.field} is required`));
          if (stopOnFirstError) break;
          continue;
        }

        // Skip validation if field is not required and empty
        if (!rule.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
          continue;
        }

        // Run validation
        const isValid = await rule.validator(fieldValue, data);
        if (!isValid) {
          errors.push(new ValidationError(rule.field, rule.message));
          if (stopOnFirstError) break;
        }
      } catch (error) {
        this.logger.error(`Validation error for field ${rule.field}:`, error);
        errors.push(new ValidationError(rule.field, `Validation failed: ${error.message}`));
        if (stopOnFirstError) break;
      }
    }

    return errors;
  }

  private async sanitizeData<T>(
    data: T,
    sanitizers: SanitizerRule<T>[]
  ): Promise<T> {
    const sanitized = { ...data };

    for (const sanitizer of sanitizers) {
      try {
        const fieldValue = this.getNestedValue(sanitized, sanitizer.field);
        if (fieldValue !== undefined) {
          const sanitizedValue = sanitizer.sanitizer(fieldValue, sanitized);
          this.setNestedValue(sanitized, sanitizer.field, sanitizedValue);
        }
      } catch (error) {
        this.logger.error(`Sanitization error for field ${sanitizer.field}:`, error);
      }
    }

    return sanitized;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private initializeCommonRules(): void {
    // Email validation
    this.registerCommonRule({
      field: 'email',
      validator: (value) => this.validateEmail(value),
      message: 'Invalid email format',
      required: true
    });

    // Password validation
    this.registerCommonRule({
      field: 'password',
      validator: (value) => this.validatePassword(value).isValid,
      message: 'Password does not meet security requirements',
      required: true
    });

    // Name validation
    this.registerCommonRule({
      field: 'firstName',
      validator: (value) => typeof value === 'string' && value.trim().length >= 2,
      message: 'First name must be at least 2 characters long',
      required: true
    });

    this.registerCommonRule({
      field: 'lastName',
      validator: (value) => typeof value === 'string' && value.trim().length >= 2,
      message: 'Last name must be at least 2 characters long',
      required: true
    });

    // ID validation
    this.registerCommonRule({
      field: 'id',
      validator: (value) => typeof value === 'string' && value.trim().length > 0,
      message: 'ID is required',
      required: true
    });

    // Tenant ID validation
    this.registerCommonRule({
      field: 'tenantId',
      validator: (value) => typeof value === 'string' && value.trim().length > 0,
      message: 'Tenant ID is required',
      required: true
    });
  }
}

/**
 * Fluent API for building validation schemas
 */
export class ValidationSchemaBuilder<T = any> {
  private schema: ValidationSchema<T> = { rules: [], sanitizers: [] };

  required(field: string, validator: (value: any, data: T) => boolean | Promise<boolean>, message: string): this {
    this.schema.rules.push({
      field,
      validator,
      message,
      required: true
    });
    return this;
  }

  optional(field: string, validator: (value: any, data: T) => boolean | Promise<boolean>, message: string): this {
    this.schema.rules.push({
      field,
      validator,
      message,
      required: false
    });
    return this;
  }

  sanitize(field: string, sanitizer: (value: any, data: T) => any): this {
    this.schema.sanitizers!.push({
      field,
      sanitizer
    });
    return this;
  }

  build(): ValidationSchema<T> {
    return this.schema;
  }
}
