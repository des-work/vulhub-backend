import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Configuration
import { DatabaseModule } from './adapters/database/database.module';
import { MemoryCacheModule } from './adapters/cache/cache.module';
import { StorageModule } from './adapters/storage/storage.module';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { LeaderboardsModule } from './modules/leaderboards/leaderboards.module';
import { BadgesModule } from './modules/badges/badges.module';

// Common modules
import { HealthModule } from './common/health/health.module';
import { WebSocketModule } from './ws/websocket.module';

// Configuration
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation';
import { EnvironmentValidator } from './config/environment-validator';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Infrastructure adapters
    DatabaseModule,
    MemoryCacheModule,
    StorageModule,

    // Core business modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    SubmissionsModule,
    LeaderboardsModule,
    BadgesModule,

    // Common modules
    HealthModule,
    WebSocketModule,
  ],
  providers: [EnvironmentValidator],
})
export class AppModule {}
