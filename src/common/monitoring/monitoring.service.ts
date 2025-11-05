import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private metrics: Map<string, any> = new Map();
  private alerts: any[] = [];

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('responseTime', 150);
    this.metrics.set('errorRate', 0.5);
    this.metrics.set('requestCount', 1000);
    this.metrics.set('activeConnections', 25);
    this.metrics.set('memoryUsage', 65);
    this.metrics.set('cpuUsage', 45);
  }

  getMonitoringOverview(): any {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(this.metrics),
      activeAlerts: this.alerts.filter(alert => alert.status === 'active').length,
      totalAlerts: this.alerts.length,
    };
  }

  getAllMetrics(): any {
    return Object.fromEntries(this.metrics);
  }

  getMetric(name: string): any {
    return {
      name,
      value: this.metrics.get(name),
      timestamp: new Date().toISOString(),
    };
  }

  getActiveAlerts(): any[] {
    return this.alerts.filter(alert => alert.status === 'active');
  }

  getAlertHistory(): any[] {
    return this.alerts;
  }

  acknowledgeAlert(id: string): any {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date().toISOString();
    }
    return alert;
  }

  resolveAlert(id: string): any {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
    }
    return alert;
  }

  getDashboards(): any[] {
    return [
      {
        id: 'dashboard-1',
        name: 'System Overview',
        description: 'Main system monitoring dashboard',
        widgets: ['performance', 'errors', 'users'],
        createdAt: new Date().toISOString(),
      },
    ];
  }

  getDashboard(id: string): any {
    return this.getDashboards().find(d => d.id === id);
  }

  createDashboard(dashboard: any): any {
    const newDashboard = {
      id: `dashboard-${Date.now()}`,
      ...dashboard,
      createdAt: new Date().toISOString(),
    };
    return newDashboard;
  }

  getReports(): any[] {
    return [
      {
        id: 'report-1',
        name: 'Daily Performance Report',
        description: 'Daily system performance metrics',
        schedule: '0 9 * * *',
        lastGenerated: new Date().toISOString(),
      },
    ];
  }

  getReport(id: string): any {
    return this.getReports().find(r => r.id === id);
  }

  generateReport(id: string): any {
    return {
      id: `report-${Date.now()}`,
      reportId: id,
      generatedAt: new Date().toISOString(),
      status: 'completed',
    };
  }

  getMonitoringHealth(): any {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(this.metrics),
    };
  }

  testAlert(testAlert: any): any {
    const alert = {
      id: `alert-${Date.now()}`,
      message: testAlert.message,
      severity: testAlert.severity || 'info',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    
    this.alerts.push(alert);
    return alert;
  }
}
