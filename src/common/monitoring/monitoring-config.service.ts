import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MonitoringConfig {
  enabled: boolean;
  metrics: {
    collectionInterval: number;
    retentionPeriod: number;
    exportInterval: number;
  };
  alerts: {
    enabled: boolean;
    channels: string[];
    thresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  dashboards: {
    enabled: boolean;
    refreshInterval: number;
    widgets: string[];
  };
  reports: {
    enabled: boolean;
    schedule: string;
    recipients: string[];
  };
}

@Injectable()
export class MonitoringConfigService {
  private readonly logger = new Logger(MonitoringConfigService.name);
  private config: MonitoringConfig;

  constructor(private configService: ConfigService) {
    this.loadMonitoringConfig();
  }

  private loadMonitoringConfig(): void {
    this.config = {
      enabled: this.configService.get('MONITORING_ENABLED', 'true') === 'true',
      metrics: {
        collectionInterval: parseInt(this.configService.get('METRICS_COLLECTION_INTERVAL', '60000')), // 1 minute
        retentionPeriod: parseInt(this.configService.get('METRICS_RETENTION_PERIOD', '2592000')), // 30 days
        exportInterval: parseInt(this.configService.get('METRICS_EXPORT_INTERVAL', '300000')), // 5 minutes
      },
      alerts: {
        enabled: this.configService.get('ALERTS_ENABLED', 'true') === 'true',
        channels: this.configService.get('ALERT_CHANNELS', 'email,slack').split(','),
        thresholds: {
          responseTime: parseInt(this.configService.get('ALERT_RESPONSE_TIME_THRESHOLD', '2000')), // 2 seconds
          errorRate: parseFloat(this.configService.get('ALERT_ERROR_RATE_THRESHOLD', '5.0')), // 5%
          memoryUsage: parseFloat(this.configService.get('ALERT_MEMORY_USAGE_THRESHOLD', '80.0')), // 80%
          cpuUsage: parseFloat(this.configService.get('ALERT_CPU_USAGE_THRESHOLD', '80.0')), // 80%
        },
      },
      dashboards: {
        enabled: this.configService.get('DASHBOARDS_ENABLED', 'true') === 'true',
        refreshInterval: parseInt(this.configService.get('DASHBOARD_REFRESH_INTERVAL', '30000')), // 30 seconds
        widgets: this.configService.get('DASHBOARD_WIDGETS', 'performance,errors,users,alerts').split(','),
      },
      reports: {
        enabled: this.configService.get('REPORTS_ENABLED', 'true') === 'true',
        schedule: this.configService.get('REPORTS_SCHEDULE', '0 9 * * 1'), // Weekly on Monday at 9 AM
        recipients: this.configService.get('REPORT_RECIPIENTS', 'admin@vulhub.com').split(','),
      },
    };

    this.logger.log('Monitoring configuration loaded successfully');
  }

  getConfig(): MonitoringConfig {
    return this.config;
  }

  isMonitoringEnabled(): boolean {
    return this.config.enabled;
  }

  getMetricsConfig() {
    return this.config.metrics;
  }

  getAlertsConfig() {
    return this.config.alerts;
  }

  getDashboardsConfig() {
    return this.config.dashboards;
  }

  getReportsConfig() {
    return this.config.reports;
  }

  updateConfig(updates: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.log('Monitoring configuration updated');
  }
}
