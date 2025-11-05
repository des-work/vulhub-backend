import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../adapters/database/prisma.service';
import { UsersService } from '../../users/application/users.service';
import { TokenBlacklistService } from '../../../common/services/token-blacklist.service';
import { LoginDto, RegisterDto } from '../../../shared';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private configService: ConfigService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error('User validation failed:', error);
      throw error;
    }
  }

  /**
   * Login user and generate tokens
   */
  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: this.configService.get<string>('app.jwt.refreshSecret'),
          expiresIn: this.configService.get<string>('app.jwt.refreshExpiresIn'),
        },
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(registerDto: RegisterDto) {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        throw new UnauthorizedException('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(
        registerDto.password,
        this.configService.get<number>('app.security.bcryptRounds'),
      );

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      });

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: this.configService.get<string>('app.jwt.refreshSecret'),
          expiresIn: this.configService.get<string>('app.jwt.refreshExpiresIn'),
        },
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          avatarUrl: true,
          preferences: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      this.logger.error('Get profile failed:', error);
      throw error;
    }
  }

  /**
   * Logout user (invalidate tokens)
   */
  async logout(userId: string, token?: string) {
    try {
      if (token) {
        // Blacklist the specific token
        const expiresIn = this.tokenBlacklistService.getTokenExpiration(token);
        await this.tokenBlacklistService.blacklistToken(token, userId, expiresIn);
        this.logger.log(`Token blacklisted for user ${userId}`);
      } else {
        // Blacklist all tokens for the user (logout from all devices)
        await this.tokenBlacklistService.blacklistAllUserTokens(userId);
        this.logger.log(`All tokens blacklisted for user ${userId}`);
      }
      
      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Logout failed:', error);
      throw error;
    }
  }
}
