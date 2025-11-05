import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../adapters/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async findMany(args: Prisma.UserFindManyArgs) {
    return this.prisma.user.findMany(args);
  }

  async findUnique(args: Prisma.UserFindUniqueArgs) {
    return this.prisma.user.findUnique(args);
  }

  async update(args: Prisma.UserUpdateArgs) {
    return this.prisma.user.update(args);
  }

  async delete(args: Prisma.UserDeleteArgs) {
    return this.prisma.user.delete(args);
  }

  async count(args: Prisma.UserCountArgs) {
    return this.prisma.user.count(args);
  }
}
