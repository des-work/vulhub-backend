import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../adapters/database/prisma.service';

export interface HealthIndicatorResult {
  [key: string]: {
    status: string;
    message?: string;
    error?: string;
  };
}

@Injectable()
export class DatabaseHealthIndicator {
  constructor(private prisma: PrismaService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const isHealthy = await this.prisma.isHealthy();
      
      if (isHealthy) {
        return {
          [key]: {
            status: 'up',
            message: 'Database is healthy',
          },
        };
      } else {
        return {
          [key]: {
            status: 'down',
            error: 'Database health check failed',
          },
        };
      }
    } catch (error) {
      return {
        [key]: {
          status: 'down',
          error: error.message || 'Database connection failed',
        },
      };
    }
  }
}
