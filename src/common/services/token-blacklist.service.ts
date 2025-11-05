import { Injectable, Logger } from '@nestjs/common';
import { MemoryCacheService } from '../../adapters/cache/memory-cache.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(
    private cacheService: MemoryCacheService,
    private jwtService: JwtService,
  ) {}

  /**
   * Add token to blacklist
   */
  async blacklistToken(token: string, userId: string, expiresIn: number): Promise<void> {
    try {
      const key = `blacklist:${token}`;
      const ttl = Math.max(expiresIn, 3600); // Minimum 1 hour TTL
      
      await this.cacheService.setex(key, ttl, userId);
      this.logger.log(`Token blacklisted for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to blacklist token:', error);
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const key = `blacklist:${token}`;
      const result = await this.cacheService.get(key);
      return !!result;
    } catch (error) {
      this.logger.error('Failed to check token blacklist:', error);
      return false; // Fail open for availability
    }
  }

  /**
   * Blacklist all tokens for a user (logout from all devices)
   */
  async blacklistAllUserTokens(userId: string): Promise<void> {
    try {
      const pattern = `blacklist:*`;
      const keys = await this.cacheService.keys(pattern);
      
      const userTokens = [];
      for (const key of keys) {
        const tokenUserId = await this.cacheService.get(key);
        if (tokenUserId === userId) {
          userTokens.push(key);
        }
      }
      
      if (userTokens.length > 0) {
        await this.cacheService.delMultiple(...userTokens);
        this.logger.log(`Blacklisted ${userTokens.length} tokens for user ${userId}`);
      }
    } catch (error) {
      this.logger.error('Failed to blacklist all user tokens:', error);
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): number {
    try {
      const payload = this.jwtService.decode(token) as any;
      if (payload && payload.exp) {
        return payload.exp - Math.floor(Date.now() / 1000);
      }
      return 3600; // Default 1 hour
    } catch (error) {
      this.logger.error('Failed to decode token:', error);
      return 3600; // Default 1 hour
    }
  }
}
