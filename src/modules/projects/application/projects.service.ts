import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ProjectsRepository } from '../infrastructure/projects.repository';
import { CreateProjectDto, UpdateProjectDto, ProjectSearchDto } from '../../../shared';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private projectsRepository: ProjectsRepository) {}

  /**
   * Create a new project
   */
  async create(createProjectDto: CreateProjectDto) {
    try {
      this.logger.log(`Creating project: ${createProjectDto.name}`);
      
      // Check if project with same vulhubId already exists
      const existingProject = await this.projectsRepository.findFirst({
        where: {
          vulhubId: createProjectDto.vulhubId,
        },
      });

      if (existingProject) {
        throw new Error('Project with this VulHub ID already exists');
      }

      return await this.projectsRepository.create(createProjectDto as any);
    } catch (error) {
      this.logger.error('Failed to create project:', error);
      throw error;
    }
  }

  /**
   * Get all projects with pagination and filtering
   */
  async findAll(
    searchDto: ProjectSearchDto,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const skip = (page - 1) * limit;
      
      // Simplified search - just basic filtering
      const where = {
        ...(searchDto.query && { name: { contains: searchDto.query } }),
        ...(searchDto.category && { category: searchDto.category }),
        ...(searchDto.difficulty && { difficulty: searchDto.difficulty }),
        ...(searchDto.isActive !== undefined && { isActive: searchDto.isActive }),
        ...(searchDto.isPublic !== undefined && { isPublic: searchDto.isPublic }),
      };

      const [projects, total] = await Promise.all([
        this.projectsRepository.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.projectsRepository.count({ where }),
      ]);

      return {
        data: projects,
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
      this.logger.error('Failed to get projects:', error);
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  async findOne(id: string) {
    try {
      const project = await this.projectsRepository.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      return project;
    } catch (error) {
      this.logger.error(`Failed to get project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update project
   */
  async update(id: string, updateProjectDto: UpdateProjectDto) {
    try {
      const project = await this.projectsRepository.findUnique({
        where: { id },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      return await this.projectsRepository.update({
        where: { id },
        data: updateProjectDto,
      });
    } catch (error) {
      this.logger.error(`Failed to update project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete project
   */
  async remove(id: string) {
    try {
      const project = await this.projectsRepository.findUnique({
        where: { id },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      return await this.projectsRepository.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get project statistics
   */
  async getStats(id: string) {
    try {
      const project = await this.projectsRepository.findUnique({
        where: { id },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // Get submission statistics
      const [totalSubmissions, approvedSubmissions, averageScore] = await Promise.all([
        this.projectsRepository.countSubmissions(id),
        this.projectsRepository.countApprovedSubmissions(id),
        this.projectsRepository.getAverageScore(id),
      ]);

      return {
        totalSubmissions,
        approvedSubmissions,
        pendingSubmissions: totalSubmissions - approvedSubmissions,
        averageScore: averageScore || 0,
        completionRate: totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get project stats ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get projects by category
   */
  async findByCategory(category: string) {
    try {
      return await this.projectsRepository.findMany({
        where: { category, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get projects by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Get projects by difficulty
   */
  async findByDifficulty(difficulty: string) {
    try {
      return await this.projectsRepository.findMany({
        where: { difficulty, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get projects by difficulty ${difficulty}:`, error);
      throw error;
    }
  }

  /**
   * Toggle project active status
   */
  async toggleActive(id: string) {
    try {
      const project = await this.projectsRepository.findUnique({
        where: { id },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      return await this.projectsRepository.update({
        where: { id },
        data: { isActive: !project.isActive },
      });
    } catch (error) {
      this.logger.error(`Failed to toggle project active status ${id}:`, error);
      throw error;
    }
  }
}
