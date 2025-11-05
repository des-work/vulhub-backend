import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async () => {
        const logger = new Logger('DatabaseModule');
        try {
          const prismaService = new PrismaService();
          await prismaService.$connect();
          logger.log('✅ Database connected successfully');
          return prismaService;
        } catch (error) {
          logger.warn('⚠️ Database connection failed - running in mock mode');
          logger.warn(`Database error: ${error.message}`);
          // Return a mock service for development
          return {
            $connect: () => Promise.resolve(),
            $disconnect: () => Promise.resolve(),
            isHealthy: () => Promise.resolve(false),
            // Add other methods as needed
          };
        }
      },
    },
  ],
  exports: [PrismaService, 'DATABASE_CONNECTION'],
})
export class DatabaseModule {}
