import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class MemoryCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(MemoryCacheService.name);
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly maxSize = 10000; // Maximum number of entries

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
    
    this.logger.log('✅ Memory cache initialized');
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.logger.log('✅ Memory cache cleared');
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set value with optional expiration
   */
  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    // Enforce max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expiresAt = ttl ? Date.now() + ttl * 1000 : 0;
    this.cache.set(key, { value, expiresAt });
    
    return 'OK';
  }

  /**
   * Set value with expiration
   */
  async setex(key: string, ttl: number, value: string): Promise<'OK'> {
    return this.set(key, value, ttl);
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<number> {
    const existed = this.cache.has(key);
    if (existed) {
      this.cache.delete(key);
      return 1;
    }
    return 0;
  }

  /**
   * Delete multiple keys
   */
  async delMultiple(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Set expiration for key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    entry.expiresAt = Date.now() + ttl * 1000;
    return true;
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry || !entry.expiresAt) {
      return -1; // No expiration
    }

    const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2; // -2 means expired
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    const entry = this.cache.get(key);
    let currentValue = 0;

    if (entry && (!entry.expiresAt || Date.now() <= entry.expiresAt)) {
      currentValue = parseInt(entry.value) || 0;
    }

    const newValue = currentValue + 1;
    const expiresAt = entry?.expiresAt || 0;
    this.cache.set(key, { value: newValue.toString(), expiresAt });
    
    return newValue;
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    const entry = this.cache.get(key);
    let currentValue = 0;

    if (entry && (!entry.expiresAt || Date.now() <= entry.expiresAt)) {
      currentValue = parseInt(entry.value) || 0;
    }

    const newValue = Math.max(0, currentValue - 1);
    const expiresAt = entry?.expiresAt || 0;
    this.cache.set(key, { value: newValue.toString(), expiresAt });
    
    return newValue;
  }

  /**
   * Get keys matching pattern (simple wildcard support)
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = this.patternToRegex(pattern);
    const matchingKeys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        // Check if not expired
        const entry = this.cache.get(key);
        if (entry && (!entry.expiresAt || Date.now() <= entry.expiresAt)) {
          matchingKeys.push(key);
        }
      }
    }

    return matchingKeys;
  }

  /**
   * Get cache info (simplified)
   */
  async info(section?: string): Promise<string> {
    const size = this.cache.size;
    const memoryUsage = this.estimateMemoryUsage();
    
    if (section === 'memory') {
      return `used_memory_human:${memoryUsage}\r\n`;
    }
    
    if (section === 'keyspace') {
      return `keys=${size}\r\n`;
    }

    return `size: ${size}\r\nmemory: ${memoryUsage}\r\n`;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    return true; // Memory cache is always available
  }

  /**
   * Ping (for compatibility)
   */
  async ping(): Promise<string> {
    return 'PONG';
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Convert Redis pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    // Convert * to .* and escape other special chars
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): string {
    let totalSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length + entry.value.length + 16; // Rough estimate
    }
    
    if (totalSize < 1024) {
      return `${totalSize}B`;
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(2)}K`;
    } else {
      return `${(totalSize / (1024 * 1024)).toFixed(2)}M`;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    memoryUsage: string;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }
}

