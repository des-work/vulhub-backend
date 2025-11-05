import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../services/cache.service';

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface MetricSummary {
  name: string;
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  lastValue: number;
  lastUpdated: Date;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: Map<string, MetricData[]> = new Map();

  constructor(private cacheService: CacheService) {}

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    // Store in memory
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Keep only last 1000 metrics per name
    if (metricHistory.length > 1000) {
      metricHistory.splice(0, metricHistory.length - 1000);
    }

    // Store in cache for persistence
    this.cacheService.set(`metrics:${name}:latest`, metric, { ttl: 3600 }).catch(error => {
      this.logger.error(`Failed to cache metric ${name}:`, error);
    });

    this.logger.debug(`Recorded metric: ${name} = ${value}`);
  }

  /**
   * Record response time metric
   */
  recordResponseTime(endpoint: string, method: string, duration: number, statusCode: number): void {
    this.recordMetric('response_time', duration, {
      endpoint,
      method,
      status_code: statusCode.toString(),
    });
  }

  /**
   * Record error metric
   */
  recordError(errorType: string, errorMessage: string, context?: Record<string, string>): void {
    this.recordMetric('error_count', 1, {
      error_type: errorType,
      error_message: errorMessage,
      ...context,
    });
  }

  /**
   * Record business metric
   */
  recordBusinessMetric(metricName: string, value: number, tenantId?: string, userId?: string): void {
    const tags: Record<string, string> = {};
    if (tenantId) tags.tenant_id = tenantId;
    if (userId) tags.user_id = userId;

    this.recordMetric(metricName, value, tags);
  }

  /**
   * Record cache metric
   */
  recordCacheMetric(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, duration?: number): void {
    this.recordMetric('cache_operation', operation === 'hit' ? 1 : 0, {
      operation,
      key: key.substring(0, 50), // Truncate long keys
    });

    if (duration !== undefined) {
      this.recordMetric('cache_duration', duration, {
        operation,
      });
    }
  }

  /**
   * Record database metric
   */
  recordDatabaseMetric(operation: string, table: string, duration: number, rowsAffected?: number): void {
    this.recordMetric('database_operation', duration, {
      operation,
      table,
      rows_affected: rowsAffected?.toString() || '0',
    });
  }

  /**
   * Get metric summary
   */
  getMetricSummary(name: string, timeRange?: { from: Date; to: Date }): MetricSummary | null {
    const metricHistory = this.metrics.get(name);
    if (!metricHistory || metricHistory.length === 0) {
      return null;
    }

    let filteredMetrics = metricHistory;
    if (timeRange) {
      filteredMetrics = metricHistory.filter(
        m => m.timestamp >= timeRange.from && m.timestamp <= timeRange.to
      );
    }

    if (filteredMetrics.length === 0) {
      return null;
    }

    const values = filteredMetrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const average = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const lastValue = values[values.length - 1];
    const lastUpdated = filteredMetrics[filteredMetrics.length - 1].timestamp;

    return {
      name,
      count,
      sum,
      average,
      min,
      max,
      lastValue,
      lastUpdated,
    };
  }

  /**
   * Get all metric summaries
   */
  getAllMetricSummaries(): MetricSummary[] {
    const summaries: MetricSummary[] = [];
    
    for (const [name] of this.metrics) {
      const summary = this.getMetricSummary(name);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries;
  }

  /**
   * Get metrics by tags
   */
  getMetricsByTags(tags: Record<string, string>): MetricData[] {
    const results: MetricData[] = [];

    for (const [, metricHistory] of this.metrics) {
      for (const metric of metricHistory) {
        if (metric.tags) {
          const matches = Object.entries(tags).every(
            ([key, value]) => metric.tags![key] === value
          );
          
          if (matches) {
            results.push(metric);
          }
        }
      }
    }

    return results;
  }

  /**
   * Get top metrics by value
   */
  getTopMetrics(name: string, limit: number = 10): MetricData[] {
    const metricHistory = this.metrics.get(name);
    if (!metricHistory) {
      return [];
    }

    return metricHistory
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  /**
   * Get metrics dashboard data
   */
  async getMetricsDashboard(): Promise<any> {
    const summaries = this.getAllMetricSummaries();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent metrics
    const recentMetrics = summaries.map(summary => ({
      ...summary,
      recent: this.getMetricSummary(summary.name, { from: oneHourAgo, to: now }),
    }));

    // Get system metrics
    const systemMetrics = {
      totalMetrics: summaries.length,
      totalDataPoints: summaries.reduce((sum, s) => sum + s.count, 0),
      averageResponseTime: this.getMetricSummary('response_time')?.average || 0,
      errorRate: this.getMetricSummary('error_count')?.average || 0,
      cacheHitRate: this.calculateCacheHitRate(),
    };

    return {
      systemMetrics,
      recentMetrics,
      timestamp: now,
    };
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    const hitSummary = this.getMetricSummary('cache_operation');
    if (!hitSummary) return 0;

    const totalOperations = hitSummary.count;
    const hits = hitSummary.sum;
    
    return totalOperations > 0 ? (hits / totalOperations) * 100 : 0;
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    for (const [name, metricHistory] of this.metrics) {
      const filtered = metricHistory.filter(m => m.timestamp > cutoff);
      this.metrics.set(name, filtered);
    }

    this.logger.log(`Cleared metrics older than ${olderThanHours} hours`);
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): any {
    if (format === 'prometheus') {
      return this.exportPrometheusFormat();
    }

    return {
      timestamp: new Date(),
      metrics: Array.from(this.metrics.entries()).map(([name, data]) => ({
        name,
        data: data.slice(-100), // Last 100 data points
      })),
    };
  }

  /**
   * Export in Prometheus format
   */
  private exportPrometheusFormat(): string {
    const lines: string[] = [];
    lines.push('# HELP vulhub_metrics Application metrics');
    lines.push('# TYPE vulhub_metrics gauge');

    for (const [name, metricHistory] of this.metrics) {
      const latest = metricHistory[metricHistory.length - 1];
      if (latest) {
        const tags = latest.tags ? 
          Object.entries(latest.tags).map(([k, v]) => `${k}="${v}"`).join(',') : '';
        const metricName = `vulhub_${name}`.replace(/[^a-zA-Z0-9_]/g, '_');
        lines.push(`${metricName}{${tags}} ${latest.value} ${latest.timestamp.getTime()}`);
      }
    }

    return lines.join('\n');
  }
}
