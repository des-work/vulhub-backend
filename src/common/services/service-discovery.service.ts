import { Injectable, Logger } from '@nestjs/common';

export interface ServiceInfo {
  name: string;
  version: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  endpoints: string[];
  lastHeartbeat: Date;
}

@Injectable()
export class ServiceDiscoveryService {
  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private services = new Map<string, ServiceInfo>();

  constructor() {
    this.registerDefaultServices();
  }

  private registerDefaultServices() {
    this.registerService({
      name: 'api',
      version: '1.0.0',
      status: 'healthy',
      endpoints: ['/api/v1'],
      lastHeartbeat: new Date(),
    });

    this.registerService({
      name: 'database',
      version: '1.0.0',
      status: 'healthy',
      endpoints: ['postgresql://localhost:5432'],
      lastHeartbeat: new Date(),
    });

    this.registerService({
      name: 'redis',
      version: '1.0.0',
      status: 'healthy',
      endpoints: ['redis://localhost:6379'],
      lastHeartbeat: new Date(),
    });
  }

  registerService(service: ServiceInfo): void {
    this.services.set(service.name, service);
    this.logger.log(`Service ${service.name} registered`);
  }

  unregisterService(serviceName: string): void {
    this.services.delete(serviceName);
    this.logger.log(`Service ${serviceName} unregistered`);
  }

  getService(serviceName: string): ServiceInfo | undefined {
    return this.services.get(serviceName);
  }

  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  getHealthyServices(): ServiceInfo[] {
    return this.getAllServices().filter(service => service.status === 'healthy');
  }

  updateServiceStatus(serviceName: string, status: ServiceInfo['status']): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.status = status;
      service.lastHeartbeat = new Date();
      this.logger.log(`Service ${serviceName} status updated to ${status}`);
    }
  }

  heartbeat(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.lastHeartbeat = new Date();
    }
  }
}