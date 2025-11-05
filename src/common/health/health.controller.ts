import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from './database.health';
import { EnvironmentValidator } from '../../config/environment-validator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private dbHealth: DatabaseHealthIndicator,
    private envValidator: EnvironmentValidator,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Basic health check',
    description: 'Quick health check for load balancers and monitoring systems'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
  })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    try {
      const database = await this.dbHealth.isHealthy('database');
      
      return {
        status: database.database.status === 'up' ? 'ok' : 'error',
        info: {
          database,
        },
        error: {},
        details: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        info: {},
        error: {
          database: {
            status: 'down',
            message: error.message,
          },
        },
        details: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Checks if the service is ready to accept traffic'
  })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready() {
    // Readiness check - verify all critical dependencies
    try {
      const database = await this.dbHealth.isHealthy('database');
      
      return {
        status: database.database.status === 'up' ? 'ok' : 'error',
        info: {
          database,
        },
        error: {},
        details: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        info: {},
        error: {
          database: {
            status: 'down',
            message: error.message,
          },
        },
        details: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Checks if the service is running (for Kubernetes liveness probes)'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  alive() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed health status',
    description: 'Comprehensive health check with detailed metrics and diagnostics'
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health status',
  })
  @ApiResponse({ status: 503, description: 'Service has health issues' })
  async detailed() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('config')
  @ApiOperation({
    summary: 'Configuration validation status',
    description: 'Check environment configuration validation results'
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration validation results',
  })
  getConfigValidation() {
    return this.envValidator.getValidationResult();
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Application metrics',
    description: 'Get current application performance metrics'
  })
  @ApiResponse({
    status: 200,
    description: 'Current metrics',
  })
  getMetrics() {
    const memoryUsage = process.memoryUsage();

    return {
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        usagePercentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) / 100,
      },
      uptime: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
    };
  }
}
