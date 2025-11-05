import type { Express } from 'express';
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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SubmissionsService } from '../application/submissions.service';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { CreateSubmissionDto, UpdateSubmissionDto, SubmissionReviewDto } from '../../../shared';

@ApiTags('submissions')
@Controller('submissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'evidence', maxCount: 10 }, // Allow up to 10 evidence files
    ]),
  )
  @ApiOperation({ summary: 'Create a new submission with optional file uploads' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        notes: { type: 'string' },
        evidence: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Submission created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createSubmissionDto: CreateSubmissionDto,
    @UploadedFiles() files: { evidence?: Express.Multer.File[] },
    @Request() req,
  ) {
    const evidenceFiles = files?.evidence || [];
    if (evidenceFiles.length > 0) {
      return this.submissionsService.createWithFiles(
        createSubmissionDto,
        req.user.id,
        evidenceFiles,
      );
    }
    return this.submissionsService.create(createSubmissionDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all submissions with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Submissions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Request() req,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.submissionsService.findAll(page, limit, status, projectId, userId);
  }

  @Get('my-submissions')
  @ApiOperation({ summary: 'Get current user submissions' })
  @ApiResponse({ status: 200, description: 'User submissions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMySubmissions(@Request() req) {
    return this.submissionsService.findByUser(req.user.id);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get submissions for a project' })
  @ApiResponse({ status: 200, description: 'Project submissions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByProject(@Param('projectId') projectId: string, @Request() req) {
    return this.submissionsService.findByProject(projectId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get submission statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@Request() req) {
    return this.submissionsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get submission by ID' })
  @ApiResponse({ status: 200, description: 'Submission retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.submissionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update submission' })
  @ApiResponse({ status: 200, description: 'Submission updated successfully' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id') id: string, @Body() updateSubmissionDto: UpdateSubmissionDto, @Request() req) {
    return this.submissionsService.update(id, updateSubmissionDto);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Review submission (instructor/admin only)' })
  @ApiResponse({ status: 200, description: 'Submission reviewed successfully' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  review(@Param('id') id: string, @Body() reviewDto: SubmissionReviewDto, @Request() req) {
    return this.submissionsService.review(id, reviewDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete submission' })
  @ApiResponse({ status: 200, description: 'Submission deleted successfully' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string, @Request() req) {
    return this.submissionsService.remove(id);
  }
}
