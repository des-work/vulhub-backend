import { Module } from '@nestjs/common';
import { UsersController } from './infrastructure/users.controller';
import { UsersService } from './application/users.service';
import { UsersRepository } from './infrastructure/users.repository';
import { ErrorHandlerService } from '../../common/errors/error-handler.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, ErrorHandlerService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
