import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../adapters/database/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async getAuditLogs(options: any): Promise<any> {
    const { page = 1, limit = 20, userId, action, resource, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getAuditLog(id: string): Promise<any> {
    return await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(period: string): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const stats = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        timestamp: {
          gte: startDate,
        },
      },
      _count: {
        action: true,
      },
    });

    return {
      period,
      startDate,
      endDate: now,
      stats,
    };
  }

  /**
   * Get available actions
   */
  async getAvailableActions(): Promise<any> {
    const actions = await this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
    });

    return actions.map(item => item.action);
  }

  /**
   * Get available resources
   */
  async getAvailableResources(): Promise<any> {
    const resources = await this.prisma.auditLog.findMany({
      select: { resource: true },
      distinct: ['resource'],
    });

    return resources.map(item => item.resource);
  }

  /**
   * Get users with activity
   */
  async getUsersWithActivity(): Promise<any> {
    const users = await this.prisma.auditLog.findMany({
      select: { userId: true },
      distinct: ['userId'],
      where: {
        userId: {
          not: null,
        },
      },
    });

    return users.map(item => item.userId);
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const report = await this.prisma.auditLog.groupBy({
      by: ['action', 'resource'],
      where,
      _count: {
        action: true,
      },
    });

    return {
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate || new Date(),
      report,
    };
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(format: string, startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: true,
      },
    });

    return {
      format,
      count: logs.length,
      data: logs,
    };
  }

  /**
   * Set retention policy
   */
  async setRetentionPolicy(policy: any): Promise<any> {
    return {
      message: 'Retention policy updated',
      policy,
    };
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs(options: any): Promise<any> {
    const { olderThanDays, dryRun = false } = options;
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    if (dryRun) {
      const count = await this.prisma.auditLog.count({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      return {
        message: `Would delete ${count} logs older than ${olderThanDays} days`,
        dryRun: true,
        count,
      };
    }

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return {
      message: `Deleted ${result.count} logs older than ${olderThanDays} days`,
      dryRun: false,
      count: result.count,
    };
  }

  /**
   * Get audit health
   */
  async getAuditHealth(): Promise<any> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      totalLogs: await this.prisma.auditLog.count(),
    };
  }
}
