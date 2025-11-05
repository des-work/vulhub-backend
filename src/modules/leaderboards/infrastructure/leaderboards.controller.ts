import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeaderboardsService } from '../application/leaderboards.service';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';

@ApiTags('leaderboards')
@Controller('leaderboards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaderboardsController {
  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get overall leaderboard' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['week', 'month', 'all'] })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getOverallLeaderboard(
    @Request() req,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('timeRange') timeRange?: 'week' | 'month' | 'all',
  ) {
    return this.leaderboardsService.getOverallLeaderboard(
      page,
      limit,
      timeRange,
    );
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get project-specific leaderboard' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Project leaderboard retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProjectLeaderboard(
    @Param('projectId') projectId: string,
    @Request() req,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ) {
    return this.leaderboardsService.getProjectLeaderboard(
      projectId,
      page,
      limit,
    );
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get category leaderboard' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Category leaderboard retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCategoryLeaderboard(
    @Param('category') category: string,
    @Request() req,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ) {
    return this.leaderboardsService.getCategoryLeaderboard(
      category,
      page,
      limit,
    );
  }

  @Get('my-rank')
  @ApiOperation({ summary: 'Get current user rank and statistics' })
  @ApiResponse({ status: 200, description: 'User rank retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyRank(@Request() req) {
    return this.leaderboardsService.getUserRank(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get leaderboard statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@Request() req) {
    return this.leaderboardsService.getLeaderboardStats();
  }

  @Get('top-performers')
  @ApiOperation({ summary: 'Get top performers' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top performers retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTopPerformers(
    @Request() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.leaderboardsService.getTopPerformers(limit);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRecentActivity(
    @Request() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return this.leaderboardsService.getRecentActivity(limit);
  }
}
