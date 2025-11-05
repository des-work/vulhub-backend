import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../adapters/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubmissionsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.SubmissionCreateInput) {
    return this.prisma.submission.create({ data });
  }

  async findMany(args: Prisma.SubmissionFindManyArgs) {
    return this.prisma.submission.findMany(args);
  }

  async findUnique(args: Prisma.SubmissionFindUniqueArgs) {
    return this.prisma.submission.findUnique(args);
  }

  async findFirst(args: Prisma.SubmissionFindFirstArgs) {
    return this.prisma.submission.findFirst(args);
  }

  async update(args: Prisma.SubmissionUpdateArgs) {
    return this.prisma.submission.update(args);
  }

  async delete(args: Prisma.SubmissionDeleteArgs) {
    return this.prisma.submission.delete(args);
  }

  async count(args: Prisma.SubmissionCountArgs) {
    return this.prisma.submission.count(args);
  }

  async findProject(projectId: string) {
    return this.prisma.project.findUnique({
      where: { id: projectId },
    });
  }
}
