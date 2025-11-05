import { Module } from '@nestjs/common';
import { BadgesController } from './infrastructure/badges.controller';
import { BadgesService } from './application/badges.service';
import { BadgesRepository } from './infrastructure/badges.repository';
import { WebSocketModule } from '../../ws/websocket.module';

@Module({
  imports: [WebSocketModule],
  controllers: [BadgesController],
  providers: [BadgesService, BadgesRepository],
  exports: [BadgesService],
})
export class BadgesModule {}
