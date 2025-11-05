import { ErrorHandlerService } from '../errors/error-handler.service';

/**
 * Decorator for consistent error handling across services
 */
export function HandleErrors(context?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const originalMethod = method;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        // Get error handler service from the instance
        const errorHandlerService = this.errorHandlerService || this.errorHandler;
        
        if (errorHandlerService) {
          const errorReport = errorHandlerService.handleError(error, {
            operation: propertyName,
            context: context || target.constructor.name,
            resource: this.constructor.name,
            metadata: { 
              args: args.length,
              method: propertyName,
              className: target.constructor.name
            }
          });
          
          // Log the error with context
          if (this.logger) {
            this.logger.error(
              `Error in ${context || target.constructor.name}.${propertyName}:`,
              error.message,
              {
                error: error.name,
                context: context || target.constructor.name,
                method: propertyName,
                args: args.length
              }
            );
          }
        } else {
          // Fallback logging if no error handler service
          if (this.logger) {
            this.logger.error(
              `Error in ${context || target.constructor.name}.${propertyName}:`,
              error.message,
              error.stack
            );
          }
        }
        
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator for handling specific error types
 */
export function HandleSpecificErrors(errorTypes: string[], context?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const originalMethod = method;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        // Check if error type should be handled
        const shouldHandle = errorTypes.some(type => 
          error.name === type || error.constructor.name === type
        );

        if (shouldHandle) {
          const errorHandlerService = this.errorHandlerService || this.errorHandler;
          
          if (errorHandlerService) {
            const errorReport = errorHandlerService.handleError(error, {
              operation: propertyName,
              context: context || target.constructor.name,
              resource: this.constructor.name,
              metadata: { 
                errorType: error.name,
                args: args.length,
                method: propertyName
              }
            });
          }
        }

        if (this.logger) {
          this.logger.error(
            `Error in ${context || target.constructor.name}.${propertyName}:`,
            error.message,
            {
              error: error.name,
              context: context || target.constructor.name,
              method: propertyName,
              handled: shouldHandle
            }
          );
        }
        
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator for retry logic with error handling
 */
export function RetryOnError(maxRetries: number = 3, delay: number = 1000, context?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const originalMethod = method;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries) {
            // Final attempt failed, handle error
            const errorHandlerService = this.errorHandlerService || this.errorHandler;
            
            if (errorHandlerService) {
              const errorReport = errorHandlerService.handleError(error, {
                operation: propertyName,
                context: context || target.constructor.name,
                resource: this.constructor.name,
                metadata: { 
                  attempt,
                  maxRetries,
                  finalAttempt: true
                }
              });
            }
            
            if (this.logger) {
              this.logger.error(
                `Error in ${context || target.constructor.name}.${propertyName} after ${maxRetries} attempts:`,
                error.message,
                {
                  error: error.name,
                  context: context || target.constructor.name,
                  method: propertyName,
                  attempts: maxRetries
                }
              );
            }
            
            throw error;
          }
          
          // Wait before retry
          if (this.logger) {
            this.logger.warn(
              `Retry ${attempt}/${maxRetries} for ${context || target.constructor.name}.${propertyName}:`,
              error.message
            );
          }
          
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
      
      throw lastError!;
    };

    return descriptor;
  };
}
