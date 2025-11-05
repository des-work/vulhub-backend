import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../adapters/database/prisma.service';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Log to database
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: entry.details ? JSON.stringify(entry.details) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          timestamp: entry.timestamp,
          success: entry.success,
          errorMessage: entry.errorMessage,
        },
      });

      // Log to application logger
      const logLevel = entry.success ? 'log' : 'error';
      this.logger[logLevel](`Audit: ${entry.action} on ${entry.resource}`, {
        userId: entry.userId,
        resourceId: entry.resourceId,
        success: entry.success,
        errorMessage: entry.errorMessage,
      });
    } catch (error) {
      this.logger.error('Failed to log audit entry:', error);
      // Don't throw to avoid breaking the main operation
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    action: 'login' | 'logout' | 'register' | 'password_change' | 'token_refresh',
    userId: string,
    success: boolean,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'auth',
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      success,
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    action: 'create' | 'read' | 'update' | 'delete',
    resource: string,
    resourceId: string,
    userId: string,
    success: boolean,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      success,
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    action: 'unauthorized_access' | 'rate_limit_exceeded' | 'suspicious_activity' | 'data_breach_attempt',
    userId: string | undefined,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'security',
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      success: false,
    });
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    action: 'startup' | 'shutdown' | 'error' | 'maintenance',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      resource: 'system',
      details,
      timestamp: new Date(),
      success: action !== 'error',
    });
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      return await this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          timestamp: true,
          success: true,
          errorMessage: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to get user audit logs:', error);
      return [];
    }
  }

  /**
   * Get all audit logs
   */
  async getAllAuditLogs(
    limit: number = 1000,
    offset: number = 0,
    fromDate?: Date,
    toDate?: Date
  ): Promise<any[]> {
    try {
      const where: any = {};
      
      if (fromDate || toDate) {
        where.timestamp = {};
        if (fromDate) where.timestamp.gte = fromDate;
        if (toDate) where.timestamp.lte = toDate;
      }

      return await this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          userId: true,
          action: true,
          resource: true,
          resourceId: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          timestamp: true,
          success: true,
          errorMessage: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to get audit logs:', error);
      return [];
    }
  }

  /**
   * Get security audit logs
   */
  async getSecurityAuditLogs(
    limit: number = 500,
    offset: number = 0
  ): Promise<any[]> {
    try {
      return await this.prisma.auditLog.findMany({
        where: {
          resource: 'security',
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          userId: true,
          action: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          timestamp: true,
          success: true,
          errorMessage: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to get security audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(fromDate?: Date, toDate?: Date) {
    try {
      const where: any = {};
      
      if (fromDate || toDate) {
        where.timestamp = {};
        if (fromDate) where.timestamp.gte = fromDate;
        if (toDate) where.timestamp.lte = toDate;
      }

      const [
        totalLogs,
        successLogs,
        errorLogs,
        uniqueUsers,
        actionsByType,
        resourcesByType,
      ] = await Promise.all([
        this.prisma.auditLog.count({ where }),
        this.prisma.auditLog.count({ where: { ...where, success: true } }),
        this.prisma.auditLog.count({ where: { ...where, success: false } }),
        this.prisma.auditLog.groupBy({
          by: ['userId'],
          where: { ...where, userId: { not: null } },
        }),
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { action: true },
        }),
        this.prisma.auditLog.groupBy({
          by: ['resource'],
          where,
          _count: { resource: true },
        }),
      ]);

      return {
        totalLogs,
        successLogs,
        errorLogs,
        successRate: totalLogs > 0 ? (successLogs / totalLogs) * 100 : 0,
        uniqueUsers: uniqueUsers.length,
        actionsByType: actionsByType.map(a => ({
          action: a.action,
          count: a._count.action,
        })),
        resourcesByType: resourcesByType.map(r => ({
          resource: r.resource,
          count: r._count.resource,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get audit statistics:', error);
      return {
        totalLogs: 0,
        successLogs: 0,
        errorLogs: 0,
        successRate: 0,
        uniqueUsers: 0,
        actionsByType: [],
        resourcesByType: [],
      };
    }
  }

  /**
   * Clean old audit logs
   */
  async cleanOldAuditLogs(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Cleaned ${result.count} old audit logs`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to clean old audit logs:', error);
      return 0;
    }
  }
}
