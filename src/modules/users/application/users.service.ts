import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../adapters/database/prisma.service';
import { UsersRepository } from '../infrastructure/users.repository';
import { CreateUserDto, UpdateUserDto, UserProfile } from '../../../shared';
import { BaseService } from '../../../common/services/base.service';
import { ErrorHandlerService } from '../../../common/errors/error-handler.service';
import { HandleErrors } from '../../../common/decorators/handle-errors.decorator';
import { UserNotFoundError, ValidationError } from '../../../common/errors/domain-error.base';

@Injectable()
export class UsersService extends BaseService {
  constructor(
    private prisma: PrismaService,
    private usersRepository: UsersRepository,
    errorHandler: ErrorHandlerService,
  ) {
    super(usersRepository, errorHandler);
  }

  /**
   * Parse preferences from database string
   */
  private parsePreferences(preferencesStr: string | null): Record<string, any> {
    if (!preferencesStr) {
      return {};
    }
    try {
      return typeof preferencesStr === 'string' ? JSON.parse(preferencesStr) : preferencesStr;
    } catch {
      return {};
    }
  }

  /**
   * Create a new user
   */
  @HandleErrors('UsersService.create')
  async create(createUserDto: CreateUserDto): Promise<UserProfile> {
    this.validateInput(createUserDto, (data) => {
      if (!data.email || !data.email.includes('@')) {
        throw new ValidationError('email', 'Invalid email format');
      }
      if (!data.firstName || data.firstName.trim().length === 0) {
        throw new ValidationError('firstName', 'First name is required');
      }
      if (!data.lastName || data.lastName.trim().length === 0) {
        throw new ValidationError('lastName', 'Last name is required');
      }
    });

    return this.handleOperation(
      async () => {
        this.logOperationStart('create', { email: createUserDto.email });
        
         const user = await this.usersRepository.create(createUserDto as any);
         
         // Map Prisma user to UserProfile
         const userProfile: UserProfile = {
           id: user.id,
           email: user.email,
           firstName: user.firstName,
           lastName: user.lastName,
           avatarUrl: user.avatarUrl || '',
           status: user.status as any,
           role: user.role as any,
           preferences: this.parsePreferences(user.preferences),
           lastLoginAt: user.lastLoginAt?.toISOString() || '',
           createdAt: user.createdAt.toISOString(),
           updatedAt: user.updatedAt.toISOString(),
         };
         
         this.logOperationSuccess('create', { userId: user.id });
         return userProfile;
      },
      'UsersService.create',
      { email: createUserDto.email }
    );
  }

  /**
   * Get all users
   */
  @HandleErrors('UsersService.findAll')
  async findAll(page: number = 1, limit: number = 20): Promise<{
    data: UserProfile[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    this.validateInput({ page, limit }, (data) => {
      if (data.page < 1) {
        throw new ValidationError('page', 'Page must be greater than 0');
      }
      if (data.limit < 1 || data.limit > 100) {
        throw new ValidationError('limit', 'Limit must be between 1 and 100');
      }
    });

    return this.handleOperation(
      async () => {
        this.logOperationStart('findAll', { page, limit });
        
         const skip = (page - 1) * limit;
         const [users, total] = await Promise.all([
           this.usersRepository.findMany({
             skip,
             take: limit,
             orderBy: { createdAt: 'desc' },
           }),
           this.usersRepository.count({}),
         ]);

         // Map Prisma users to UserProfile
         const userProfiles: UserProfile[] = users.map(user => ({
           id: user.id,
           email: user.email,
           firstName: user.firstName,
           lastName: user.lastName,
           avatarUrl: user.avatarUrl || '',
           status: user.status as any,
           role: user.role as any,
           preferences: this.parsePreferences(user.preferences),
           lastLoginAt: user.lastLoginAt?.toISOString() || '',
           createdAt: user.createdAt.toISOString(),
           updatedAt: user.updatedAt.toISOString(),
         }));

         const result = {
           data: userProfiles,
           pagination: {
             page,
             limit,
             total,
             totalPages: Math.ceil(total / limit),
             hasNext: page * limit < total,
             hasPrev: page > 1,
           },
         };
         
         this.logOperationSuccess('findAll', { count: users.length, total });
         return result;
      },
      'UsersService.findAll',
      { page, limit }
    );
  }

  /**
   * Get user by ID
   */
  @HandleErrors('UsersService.findOne')
  async findOne(id: string): Promise<UserProfile> {
    this.validateInput({ id }, (data) => {
      if (!data.id || data.id.trim().length === 0) {
        throw new ValidationError('id', 'User ID is required');
      }
    });

    return this.handleOperation(
      async () => {
        this.logOperationStart('findOne', { id });
        
         const user = await this.usersRepository.findUnique({
           where: { id },
         });

         if (!user) {
           throw new UserNotFoundError(id);
         }

         // Map Prisma user to UserProfile
         const userProfile: UserProfile = {
           id: user.id,
           email: user.email,
           firstName: user.firstName,
           lastName: user.lastName,
           avatarUrl: user.avatarUrl || '',
           status: user.status as any,
           role: user.role as any,
           preferences: this.parsePreferences(user.preferences),
           lastLoginAt: user.lastLoginAt?.toISOString() || '',
           createdAt: user.createdAt.toISOString(),
           updatedAt: user.updatedAt.toISOString(),
         };

         this.logOperationSuccess('findOne', { id, email: user.email });
         return userProfile;
      },
      'UsersService.findOne',
      { id }
    );
  }

  /**
   * Update user
   */
  @HandleErrors('UsersService.update')
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserProfile> {
    this.validateInput({ id, updateUserDto }, (data) => {
      if (!data.id || data.id.trim().length === 0) {
        throw new ValidationError('id', 'User ID is required');
      }
      if (Object.keys(data.updateUserDto).length === 0) {
        throw new ValidationError('updateUserDto', 'Update data cannot be empty');
      }
    });

    return this.handleOperation(
      async () => {
        this.logOperationStart('update', { id, updateData: updateUserDto });
        
        const user = await this.usersRepository.findUnique({ where: { id } });
        if (!user) {
          throw new UserNotFoundError(id);
        }

        const updatedUser = await this.usersRepository.update({
          where: { id },
          data: {
            ...updateUserDto,
            preferences: updateUserDto.preferences
              ? {
                  ...this.parsePreferences(user.preferences),
                  ...updateUserDto.preferences,
                }
              : user.preferences,
          },
        });

        // Map Prisma user to UserProfile
        const userProfile: UserProfile = {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          avatarUrl: updatedUser.avatarUrl || '',
          status: updatedUser.status as any,
          role: updatedUser.role as any,
          preferences: this.parsePreferences(updatedUser.preferences),
          lastLoginAt: updatedUser.lastLoginAt?.toISOString() || '',
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        };
        
        this.logOperationSuccess('update', { id, email: updatedUser.email });
        return userProfile;
      },
      'UsersService.update',
      { id, updateData: updateUserDto }
    );
  }

  /**
   * Delete user
   */
  @HandleErrors('UsersService.remove')
  async remove(id: string): Promise<UserProfile> {
    this.validateInput({ id }, (data) => {
      if (!data.id || data.id.trim().length === 0) {
        throw new ValidationError('id', 'User ID is required');
      }
    });

    return this.handleOperation(
      async () => {
        this.logOperationStart('remove', { id });
        
        const user = await this.usersRepository.findUnique({ where: { id } });
        if (!user) {
          throw new UserNotFoundError(id);
        }

        const deletedUser = await this.usersRepository.delete({ where: { id } });

        // Map Prisma user to UserProfile
        const userProfile: UserProfile = {
          id: deletedUser.id,
          email: deletedUser.email,
          firstName: deletedUser.firstName,
          lastName: deletedUser.lastName,
          avatarUrl: deletedUser.avatarUrl || '',
          status: deletedUser.status as any,
          role: deletedUser.role as any,
          preferences: this.parsePreferences(deletedUser.preferences),
          lastLoginAt: deletedUser.lastLoginAt?.toISOString() || '',
          createdAt: deletedUser.createdAt.toISOString(),
          updatedAt: deletedUser.updatedAt.toISOString(),
        };
        
        this.logOperationSuccess('remove', { id, email: deletedUser.email });
        return userProfile;
      },
      'UsersService.remove',
      { id }
    );
  }

  /**
   * Get user profile
   */
  @HandleErrors('UsersService.getProfile')
  async getProfile(id: string): Promise<UserProfile> {
    this.validateInput({ id }, (data) => {
      if (!data.id || data.id.trim().length === 0) {
        throw new ValidationError('id', 'User ID is required');
      }
    });

    return this.handleOperation(
      async () => {
        this.logOperationStart('getProfile', { id });
        
        const user = await this.usersRepository.findUnique({ where: { id } });
        if (!user) {
          throw new UserNotFoundError(id);
        }

        // Map Prisma user to UserProfile
        const userProfile: UserProfile = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl || '',
          status: user.status as any,
          role: user.role as any,
          preferences: this.parsePreferences(user.preferences),
          lastLoginAt: user.lastLoginAt?.toISOString() || '',
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };

        this.logOperationSuccess('getProfile', { id, email: user.email });
        return userProfile;
      },
      'UsersService.getProfile',
      { id }
    );
  }

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: any) {
    try {
      const user = await this.usersRepository.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return await this.usersRepository.update({
        where: { id },
        data: {
          preferences: JSON.stringify({
            ...this.parsePreferences(user.preferences),
            ...preferences,
          }),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update user preferences ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  @HandleErrors('UsersService.getStats')
  async getStats(userId: string): Promise<any> {
    this.validateInput({ userId }, (data) => {
      if (!data.userId || data.userId.trim().length === 0) {
        throw new ValidationError('userId', 'User ID is required');
      }
    });

    return this.handleOperation(
      async () => {
        this.logOperationStart('getStats', { userId });
        
        const stats = await this.prisma.submission.count({
          where: { userId },
        });
        
        return {
          submissions: stats,
          totalProjects: 0,
          lastLogin: null,
        };
      },
      'UsersService.getStats',
      { userId }
    );
  }
}
