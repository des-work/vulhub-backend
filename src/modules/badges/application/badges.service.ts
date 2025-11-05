import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { BadgesRepository } from '../infrastructure/badges.repository';
import { MemoryCacheService } from '../../../adapters/cache/memory-cache.service';
import { WebSocketGateway } from '../../../ws/websocket.gateway';
import { CreateBadgeDto, UpdateBadgeDto, AssignBadgeDto } from '../../../shared';

export interface BadgeCriteria {
  type: 'submission_count' | 'score_threshold' | 'project_completion' | 'streak' | 'category_mastery';
  value: number;
  projectId?: string;
  category?: string;
  timeRange?: 'week' | 'month' | 'all';
}

export interface BadgeProgress {
  badgeId: string;
  userId: string;
  currentValue: number;
  targetValue: number;
  progress: number; // 0-100
  isEarned: boolean;
}

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    private badgesRepository: BadgesRepository,
    private cacheService: MemoryCacheService,
    private webSocketGateway: WebSocketGateway,
  ) {}

  /**
   * Create a new badge
   */
  async create(createBadgeDto: CreateBadgeDto) {
    try {
      this.logger.log(`Creating badge: ${createBadgeDto.name}`);

      const badgeData = {
        name: createBadgeDto.name,
        category: createBadgeDto.category,
        description: createBadgeDto.description,
        icon: createBadgeDto.icon,
        difficulty: createBadgeDto.difficulty,
        isActive: createBadgeDto.isActive,
        criteria: typeof createBadgeDto.criteria === 'string' 
          ? createBadgeDto.criteria 
          : JSON.stringify(createBadgeDto.criteria),
      };

      return await this.badgesRepository.create(badgeData as any);
    } catch (error) {
      this.logger.error('Failed to create badge:', error);
      throw error;
    }
  }

  /**
   * Get all badges with pagination
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    category?: string,
    difficulty?: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      
      const where = {
        ...(category && { category }),
        ...(difficulty && { difficulty }),
      };

      const [badges, total] = await Promise.all([
        this.badgesRepository.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.badgesRepository.count({ where }),
      ]);

      return {
        data: badges,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get badges:', error);
      throw error;
    }
  }

  /**
   * Get badge by ID
   */
  async findOne(id: string) {
    try {
      const badge = await this.badgesRepository.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              userBadges: true,
            },
          },
        },
      });

      if (!badge) {
        throw new NotFoundException('Badge not found');
      }

      return badge;
    } catch (error) {
      this.logger.error(`Failed to get badge ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update badge
   */
  async update(id: string, updateBadgeDto: UpdateBadgeDto) {
    try {
      const badge = await this.badgesRepository.findUnique({
        where: { id },
      });

      if (!badge) {
        throw new NotFoundException('Badge not found');
      }

      const updateData = {
        ...updateBadgeDto,
        ...(updateBadgeDto.criteria && {
          criteria: typeof updateBadgeDto.criteria === 'string' 
            ? updateBadgeDto.criteria 
            : JSON.stringify(updateBadgeDto.criteria)
        }),
      };

      return await this.badgesRepository.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(`Failed to update badge ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete badge
   */
  async remove(id: string) {
    try {
      const badge = await this.badgesRepository.findUnique({
        where: { id },
      });

      if (!badge) {
        throw new NotFoundException('Badge not found');
      }

      return await this.badgesRepository.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete badge ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get user's badges
   */
  async getUserBadges(userId: string) {
    try {
      return await this.badgesRepository.getUserBadges(userId);
    } catch (error) {
      this.logger.error(`Failed to get user badges for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's badge progress
   */
  async getUserBadgeProgress(userId: string): Promise<BadgeProgress[]> {
    try {
      const cacheKey = `user:badge-progress:${userId}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const progress = await this.badgesRepository.getUserBadgeProgress(userId);
      
      // Cache for 5 minutes
      await this.cacheService.setex(cacheKey, 300, JSON.stringify(progress));

      return progress;
    } catch (error) {
      this.logger.error(`Failed to get user badge progress for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Assign badge to user
   */
  async assignBadge(assignBadgeDto: AssignBadgeDto) {
    try {
      this.logger.log(`Assigning badge ${assignBadgeDto.badgeId} to user ${assignBadgeDto.userId}`);

      // Check if user already has this badge
      const existingBadge = await this.badgesRepository.findUserBadge(
        assignBadgeDto.userId,
        assignBadgeDto.badgeId,
      );

      if (existingBadge) {
        throw new Error('User already has this badge');
      }

      const userBadge = await this.badgesRepository.assignBadge({
        user: { connect: { id: assignBadgeDto.userId } },
        badge: { connect: { id: assignBadgeDto.badgeId } },
        earnedAt: new Date(),
      });

      // Clear user badge progress cache
      await this.cacheService.del(`user:badge-progress:${assignBadgeDto.userId}`);

      // Broadcast badge earned event
      this.webSocketGateway.server.to(`user:${assignBadgeDto.userId}`).emit('badge:earned', {
        badge: userBadge,
        timestamp: new Date().toISOString(),
      });

      return userBadge;
    } catch (error) {
      this.logger.error('Failed to assign badge:', error);
      throw error;
    }
  }

  /**
   * Check and award badges automatically
   */
  async checkAndAwardBadges(userId: string) {
    try {
      this.logger.log(`Checking badges for user ${userId}`);

      const badges = await this.badgesRepository.findMany({
        where: { isActive: true },
      });

      const awardedBadges = [];

      for (const badge of badges) {
        const progress = await this.badgesRepository.getBadgeProgressForUser(
          badge.id,
          userId,
        );

        if (progress.isEarned) {
          await this.assignBadge({
            userId,
            badgeId: badge.id,
          });
          awardedBadges.push(badge);
        }
      }

      if (awardedBadges.length > 0) {
        this.logger.log(`Awarded ${awardedBadges.length} badges to user ${userId}`);
      }

      return awardedBadges;
    } catch (error) {
      this.logger.error(`Failed to check badges for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get badge statistics
   */
  async getBadgeStats() {
    try {
      const cacheKey = `badge:stats`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const stats = await this.badgesRepository.getBadgeStats();
      
      // Cache for 10 minutes
      await this.cacheService.setex(cacheKey, 600, JSON.stringify(stats));

      return stats;
    } catch (error) {
      this.logger.error('Failed to get badge stats:', error);
      throw error;
    }
  }

  /**
   * Get most earned badges
   */
  async getMostEarnedBadges(limit: number = 10) {
    try {
      return await this.badgesRepository.getMostEarnedBadges(limit);
    } catch (error) {
      this.logger.error('Failed to get most earned badges:', error);
      throw error;
    }
  }

  /**
   * Get recent badge awards
   */
  async getRecentBadgeAwards(limit: number = 20) {
    try {
      return await this.badgesRepository.getRecentBadgeAwards(limit);
    } catch (error) {
      this.logger.error('Failed to get recent badge awards:', error);
      throw error;
    }
  }
}
