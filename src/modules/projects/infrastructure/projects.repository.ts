import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../adapters/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ProjectCreateInput) {
    return this.prisma.project.create({ data });
  }

  async findMany(args: Prisma.ProjectFindManyArgs) {
    return this.prisma.project.findMany(args);
  }

  async findUnique(args: Prisma.ProjectFindUniqueArgs) {
    return this.prisma.project.findUnique(args);
  }

  async findFirst(args: Prisma.ProjectFindFirstArgs) {
    return this.prisma.project.findFirst(args);
  }

  async update(args: Prisma.ProjectUpdateArgs) {
    return this.prisma.project.update(args);
  }

  async delete(args: Prisma.ProjectDeleteArgs) {
    return this.prisma.project.delete(args);
  }

  async count(args: Prisma.ProjectCountArgs) {
    return this.prisma.project.count(args);
  }

  async countSubmissions(projectId: string) {
    return this.prisma.submission.count({
      where: { projectId },
    });
  }

  async countApprovedSubmissions(projectId: string) {
    return this.prisma.submission.count({
      where: { 
        projectId,
        status: 'APPROVED',
      },
    });
  }

  async getAverageScore(projectId: string) {
    const result = await this.prisma.submission.aggregate({
      where: { 
        projectId,
        status: 'APPROVED',
        score: { not: null },
      },
      _avg: {
        score: true,
      },
    });

    return result._avg.score;
  }
}
