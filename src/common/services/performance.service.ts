import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

export interface PerformanceMetrics {
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
  cacheHitRate: number;
  responseTime: number;
  errorRate: number;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 1000; // Keep last 1000 metrics
  private startTime = Date.now();

  constructor(private cacheService: CacheService) {}

  /**
   * Record performance metrics
   */
  recordMetrics(responseTime: number, errorOccurred: boolean = false) {
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: this.getActiveConnections(),
      cacheHitRate: this.calculateCacheHitRate(),
      responseTime,
      errorRate: errorOccurred ? 1 : 0,
    };

    this.metrics.push(metrics);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log performance warnings
    this.checkPerformanceThresholds(metrics);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    if (this.metrics.length === 0) {
      return null;
    }
    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    if (this.metrics.length === 0) {
      return {
        uptime: Date.now() - this.startTime,
        totalRequests: 0,
        averageResponseTime: 0,
        averageMemoryUsage: 0,
        averageCpuUsage: 0,
        cacheHitRate: 0,
        errorRate: 0,
        recommendations: [],
      };
    }

    const recentMetrics = this.metrics.slice(-100); // Last 100 metrics
    const totalRequests = this.metrics.length;
    const averageResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const averageMemoryUsage = this.metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / totalRequests;
    const averageCpuUsage = this.metrics.reduce((sum, m) => sum + m.cpuUsage.user + m.cpuUsage.system, 0) / totalRequests;
    const cacheHitRate = this.metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / totalRequests;
    const errorRate = this.metrics.reduce((sum, m) => sum + m.errorRate, 0) / totalRequests;

    const recommendations = this.generateRecommendations({
      averageResponseTime,
      averageMemoryUsage,
      averageCpuUsage,
      cacheHitRate,
      errorRate,
    });

    return {
      uptime: Date.now() - this.startTime,
      totalRequests,
      averageResponseTime,
      averageMemoryUsage,
      averageCpuUsage,
      cacheHitRate,
      errorRate,
      recommendations,
    };
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends() {
    if (this.metrics.length < 2) {
      return null;
    }

    const recent = this.metrics.slice(-10);
    const older = this.metrics.slice(-20, -10);

    if (older.length === 0) {
      return null;
    }

    const recentAvg = this.calculateAverage(recent);
    const olderAvg = this.calculateAverage(older);

    return {
      responseTime: this.calculateTrend(recentAvg.responseTime, olderAvg.responseTime),
      memoryUsage: this.calculateTrend(recentAvg.memoryUsage, olderAvg.memoryUsage),
      cacheHitRate: this.calculateTrend(recentAvg.cacheHitRate, olderAvg.cacheHitRate),
      errorRate: this.calculateTrend(recentAvg.errorRate, olderAvg.errorRate),
    };
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);
    this.logger.log(`Cleared old metrics. Remaining: ${this.metrics.length}`);
  }

  /**
   * Get active connections (placeholder - implement based on your WebSocket setup)
   */
  private getActiveConnections(): number {
    // This would be implemented based on your WebSocket gateway
    // For now, return a placeholder
    return 0;
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // This would be implemented based on your cache service
    // For now, return a placeholder
    return 0.85; // 85% hit rate
  }

  /**
   * Check performance thresholds and log warnings
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics) {
    const warnings: string[] = [];

    // Memory usage warning
    if (metrics.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      warnings.push('High memory usage detected');
    }

    // Response time warning
    if (metrics.responseTime > 1000) { // 1 second
      warnings.push('Slow response time detected');
    }

    // Cache hit rate warning
    if (metrics.cacheHitRate < 0.7) { // 70%
      warnings.push('Low cache hit rate detected');
    }

    // Error rate warning
    if (metrics.errorRate > 0.05) { // 5%
      warnings.push('High error rate detected');
    }

    if (warnings.length > 0) {
      this.logger.warn(`Performance warnings: ${warnings.join(', ')}`);
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: {
    averageResponseTime: number;
    averageMemoryUsage: number;
    averageCpuUsage: number;
    cacheHitRate: number;
    errorRate: number;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.averageResponseTime > 500) {
      recommendations.push('Consider implementing database indexes for frequently queried fields');
    }

    if (metrics.averageMemoryUsage > 300 * 1024 * 1024) { // 300MB
      recommendations.push('Consider implementing memory optimization strategies');
    }

    if (metrics.cacheHitRate < 0.8) {
      recommendations.push('Consider increasing cache TTL or implementing more aggressive caching');
    }

    if (metrics.errorRate > 0.02) { // 2%
      recommendations.push('Investigate and fix error sources to improve reliability');
    }

    if (metrics.averageCpuUsage > 80) {
      recommendations.push('Consider implementing query optimization or caching strategies');
    }

    return recommendations;
  }

  /**
   * Calculate average of metrics
   */
  private calculateAverage(metrics: PerformanceMetrics[]) {
    return {
      responseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
      memoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / metrics.length,
      cacheHitRate: metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length,
      errorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length,
    };
  }

  /**
   * Calculate trend between two values
   */
  private calculateTrend(current: number, previous: number): 'improving' | 'degrading' | 'stable' {
    const change = (current - previous) / previous;
    
    if (change > 0.1) {
      return 'degrading';
    } else if (change < -0.1) {
      return 'improving';
    } else {
      return 'stable';
    }
  }
}
