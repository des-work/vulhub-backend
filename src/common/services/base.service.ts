import { Logger } from '@nestjs/common';
import { ErrorHandlerService } from '../errors/error-handler.service';

/**
 * Base service class with common functionality
 */
export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly errorHandler: ErrorHandlerService;

  constructor(
    protected readonly repository: any,
    errorHandler: ErrorHandlerService,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.errorHandler = errorHandler;
  }

  /**
   * Handle operations with consistent error handling
   */
  protected async handleOperation<T>(
    operation: () => Promise<T>,
    context: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorReport = this.errorHandler.handleError(error, {
        operation: context,
        resource: this.constructor.name,
        metadata: {
          ...metadata,
          service: this.constructor.name,
          operation: context
        }
      });
      
      this.logger.error(
        `Operation failed: ${context}`,
        error.message,
        {
          error: error.name,
          context,
          metadata,
          service: this.constructor.name
        }
      );
      
      throw error;
    }
  }

  /**
   * Handle operations with retry logic
   */
  protected async handleOperationWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3,
    delay: number = 1000,
    metadata?: Record<string, any>
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          // Final attempt failed
          const errorReport = this.errorHandler.handleError(error, {
            operation: context,
            resource: this.constructor.name,
            metadata: {
              ...metadata,
              attempt,
              maxRetries,
              finalAttempt: true,
              service: this.constructor.name
            }
          });
          
          this.logger.error(
            `Operation failed after ${maxRetries} attempts: ${context}`,
            error.message,
            {
              error: error.name,
              context,
              attempts: maxRetries,
              metadata,
              service: this.constructor.name
            }
          );
          
          throw error;
        }
        
        // Log retry attempt
        this.logger.warn(
          `Retry ${attempt}/${maxRetries} for operation: ${context}`,
          error.message,
          {
            error: error.name,
            context,
            attempt,
            maxRetries,
            metadata,
            service: this.constructor.name
          }
        );
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError!;
  }

  /**
   * Handle operations with timeout
   */
  protected async handleOperationWithTimeout<T>(
    operation: () => Promise<T>,
    context: string,
    timeout: number = 30000,
    metadata?: Record<string, any>
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error(`Operation timeout: ${context}`);
          timeoutError.name = 'TimeoutError';
          
          this.errorHandler.handleError(timeoutError, {
            operation: context,
            resource: this.constructor.name,
            metadata: {
              ...metadata,
              timeout,
              service: this.constructor.name
            }
          });
          
          this.logger.error(
            `Operation timeout: ${context}`,
            `Timeout after ${timeout}ms`,
            {
              context,
              timeout,
              metadata,
              service: this.constructor.name
            }
          );
          
          reject(timeoutError);
        }, timeout);
      })
    ]);
  }

  /**
   * Validate input parameters
   */
  protected validateInput<T>(input: T, validator: (input: T) => void): void {
    try {
      validator(input);
    } catch (error) {
      this.logger.error(
        `Input validation failed in ${this.constructor.name}`,
        error.message,
        {
          input: typeof input === 'object' ? Object.keys(input) : typeof input,
          error: error.name,
          service: this.constructor.name
        }
      );
      
      throw error;
    }
  }

  /**
   * Log operation start
   */
  protected logOperationStart(operation: string, metadata?: Record<string, any>): void {
    this.logger.log(
      `Starting operation: ${operation}`,
      {
        operation,
        metadata,
        service: this.constructor.name,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Log operation success
   */
  protected logOperationSuccess(operation: string, metadata?: Record<string, any>): void {
    this.logger.log(
      `Operation completed successfully: ${operation}`,
      {
        operation,
        metadata,
        service: this.constructor.name,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Log operation failure
   */
  protected logOperationFailure(operation: string, error: Error, metadata?: Record<string, any>): void {
    this.logger.error(
      `Operation failed: ${operation}`,
      error.message,
      {
        operation,
        error: error.name,
        metadata,
        service: this.constructor.name,
        timestamp: new Date().toISOString()
      }
    );
  }
}
