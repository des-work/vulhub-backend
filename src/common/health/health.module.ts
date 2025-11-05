import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './database.health';

@Module({
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator],
})
export class HealthModule {}
