import { Module } from '@nestjs/common';
import { SubmissionsController } from './infrastructure/submissions.controller';
import { SubmissionsService } from './application/submissions.service';
import { SubmissionsRepository } from './infrastructure/submissions.repository';
import { ErrorHandlerService } from '../../common/errors/error-handler.service';

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsRepository, ErrorHandlerService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
