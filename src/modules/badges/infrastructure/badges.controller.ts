import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BadgesService } from '../application/badges.service';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { CreateBadgeDto, UpdateBadgeDto, AssignBadgeDto } from '../../../shared';

@ApiTags('badges')
@Controller('badges')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new badge' })
  @ApiResponse({ status: 201, description: 'Badge created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createBadgeDto: CreateBadgeDto, @Request() req) {
    return this.badgesService.create(createBadgeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all badges with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'difficulty', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Badges retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Request() req,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    return this.badgesService.findAll(page, limit, category, difficulty);
  }

  @Get('my-badges')
  @ApiOperation({ summary: 'Get current user badges' })
  @ApiResponse({ status: 200, description: 'User badges retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyBadges(@Request() req) {
    return this.badgesService.getUserBadges(req.user.id);
  }

  @Get('my-progress')
  @ApiOperation({ summary: 'Get current user badge progress' })
  @ApiResponse({ status: 200, description: 'Badge progress retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyProgress(@Request() req) {
    return this.badgesService.getUserBadgeProgress(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get badge statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@Request() req) {
    return this.badgesService.getBadgeStats();
  }

  @Get('most-earned')
  @ApiOperation({ summary: 'Get most earned badges' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Most earned badges retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMostEarned(
    @Request() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.badgesService.getMostEarnedBadges(limit);
  }

  @Get('recent-awards')
  @ApiOperation({ summary: 'Get recent badge awards' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent awards retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRecentAwards(
    @Request() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return this.badgesService.getRecentBadgeAwards(limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get badge by ID' })
  @ApiResponse({ status: 200, description: 'Badge retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Badge not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.badgesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update badge' })
  @ApiResponse({ status: 200, description: 'Badge updated successfully' })
  @ApiResponse({ status: 404, description: 'Badge not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id') id: string, @Body() updateBadgeDto: UpdateBadgeDto, @Request() req) {
    return this.badgesService.update(id, updateBadgeDto);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign badge to user' })
  @ApiResponse({ status: 201, description: 'Badge assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  assignBadge(@Body() assignBadgeDto: AssignBadgeDto, @Request() req) {
    return this.badgesService.assignBadge(assignBadgeDto);
  }

  @Post('check-badges')
  @ApiOperation({ summary: 'Check and award badges for current user' })
  @ApiResponse({ status: 200, description: 'Badge check completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  checkBadges(@Request() req) {
    return this.badgesService.checkAndAwardBadges(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete badge' })
  @ApiResponse({ status: 200, description: 'Badge deleted successfully' })
  @ApiResponse({ status: 404, description: 'Badge not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string, @Request() req) {
    return this.badgesService.remove(id);
  }
}
