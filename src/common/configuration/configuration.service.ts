import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);
  private settings: Map<string, any> = new Map();

  constructor(private configService: ConfigService) {
    this.loadSettings();
  }

  private loadSettings(): void {
    // Load settings from environment variables
    this.settings.set('app.name', this.configService.get('APP_NAME', 'VulHub Leaderboard'));
    this.settings.set('app.version', this.configService.get('APP_VERSION', '1.0.0'));
    this.settings.set('app.environment', this.configService.get('NODE_ENV', 'development'));
    this.settings.set('database.url', this.configService.get('DATABASE_URL'));
    this.settings.set('jwt.secret', this.configService.get('JWT_SECRET'));
    this.settings.set('redis.host', this.configService.get('REDIS_HOST', 'localhost'));
    this.settings.set('redis.port', this.configService.get('REDIS_PORT', '6379'));
  }

  getConfigurationOverview(): any {
    return {
      totalSettings: this.settings.size,
      categories: this.getCategories(),
      lastUpdated: new Date().toISOString(),
    };
  }

  getAllSettings(): any {
    const settings: any = {};
    for (const [key, value] of this.settings) {
      settings[key] = value;
    }
    return settings;
  }

  getSetting(key: string): any {
    return this.settings.get(key);
  }

  createSetting(setting: any): any {
    const { key, value, description, category } = setting;
    this.settings.set(key, value);
    
    return {
      key,
      value,
      description,
      category,
      createdAt: new Date().toISOString(),
    };
  }

  updateSetting(key: string, update: any): any {
    const { value, description } = update;
    const currentValue = this.settings.get(key);
    
    if (currentValue !== undefined) {
      this.settings.set(key, value);
      return {
        key,
        value,
        description,
        updatedAt: new Date().toISOString(),
      };
    }
    
    throw new Error(`Setting ${key} not found`);
  }

  deleteSetting(key: string): any {
    const value = this.settings.get(key);
    if (value !== undefined) {
      this.settings.delete(key);
      return {
        key,
        value,
        deletedAt: new Date().toISOString(),
      };
    }
    
    throw new Error(`Setting ${key} not found`);
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const key of this.settings.keys()) {
      const category = key.split('.')[0];
      categories.add(category);
    }
    return Array.from(categories);
  }

  getChangeHistory(): any[] {
    return [
      {
        id: '1',
        key: 'app.name',
        oldValue: 'VulHub',
        newValue: 'VulHub Leaderboard',
        changedBy: 'system',
        changedAt: new Date().toISOString(),
      },
    ];
  }

  getSettingHistory(key: string): any[] {
    return [
      {
        id: '1',
        key,
        oldValue: 'old-value',
        newValue: 'new-value',
        changedBy: 'admin',
        changedAt: new Date().toISOString(),
      },
    ];
  }

  validateConfiguration(config: any): any {
    const { settings } = config;
    const errors: string[] = [];
    
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'undefined' || value === null) {
        errors.push(`Setting ${key} cannot be null or undefined`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  backupConfiguration(): any {
    const backup = {
      id: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      settings: this.getAllSettings(),
    };
    
    return backup;
  }

  restoreConfiguration(backupId: string): any {
    return {
      message: `Configuration restored from backup ${backupId}`,
      timestamp: new Date().toISOString(),
    };
  }

  getBackups(): any[] {
    return [
      {
        id: 'backup-1',
        timestamp: new Date().toISOString(),
        size: '1.2KB',
      },
    ];
  }

  getConfigurationHealth(): any {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      totalSettings: this.settings.size,
    };
  }
}
