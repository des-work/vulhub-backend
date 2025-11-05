import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass, TransformOptions } from 'class-transformer';

interface ValidationFieldError {
  field: string;
  value: any;
  constraints: Record<string, string>;
}

interface ValidationErrorResponse {
  message: string;
  errors: ValidationFieldError[];
  statusCode: number;
}

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  constructor(private readonly transformOptions?: TransformOptions) {}

  async transform(value: any, { metatype, type, data }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value, this.transformOptions);
    const errors = await validate(object, {
      whitelist: true, // Strip properties that do not have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      skipMissingProperties: false, // Don't skip validation of missing properties
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatValidationErrors(errors);
      const errorResponse: ValidationErrorResponse = {
        message: this.createSummaryMessage(formattedErrors),
        errors: formattedErrors,
        statusCode: 400,
      };

      // Log validation errors for debugging
      this.logger.warn(
        `Validation failed for ${type} ${data || 'unknown'}: ${errorResponse.message}`,
        {
          errors: formattedErrors,
          inputValue: this.sanitizeValue(value),
        }
      );

      throw new BadRequestException(errorResponse);
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object, Date];
    return !types.includes(metatype);
  }

  private formatValidationErrors(errors: ValidationError[]): ValidationFieldError[] {
    return errors.map(error => ({
      field: error.property,
      value: this.sanitizeValue(error.value),
      constraints: error.constraints || {},
    }));
  }

  private createSummaryMessage(errors: ValidationFieldError[]): string {
    const fieldCount = errors.length;
    const totalConstraints = errors.reduce((sum, error) => sum + Object.keys(error.constraints).length, 0);

    if (fieldCount === 1) {
      const field = errors[0];
      const constraintMessages = Object.values(field.constraints);
      return `Validation failed for field '${field.field}': ${constraintMessages.join(', ')}`;
    }

    return `Validation failed with ${totalConstraints} error(s) across ${fieldCount} field(s)`;
  }

  private sanitizeValue(value: any): any {
    if (value === null || value === undefined) return value;

    // For sensitive fields, don't log actual values
    if (typeof value === 'string' && (
      value.includes('password') ||
      value.includes('token') ||
      value.includes('secret') ||
      value.includes('key')
    )) {
      return '[REDACTED]';
    }

    // For objects, sanitize recursively
    if (typeof value === 'object') {
      const sanitized = { ...value };
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('key')) {
          sanitized[key] = '[REDACTED]';
        }
      });
      return sanitized;
    }

    return value;
  }

  /**
   * Get detailed validation statistics for monitoring
   */
  getValidationStats(): {
    totalValidations: number;
    totalErrors: number;
    commonErrorFields: Record<string, number>;
    commonErrorTypes: Record<string, number>;
  } {
    // In a real implementation, this would track validation metrics
    return {
      totalValidations: 0,
      totalErrors: 0,
      commonErrorFields: {},
      commonErrorTypes: {},
    };
  }
}
