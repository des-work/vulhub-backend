import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ErrorHandlerService } from './common/errors/error-handler.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Compression
  app.use(compression());

  // CORS
  const corsOrigin = configService.get('app.corsOrigin');
  if (!corsOrigin) {
    throw new Error('CORS_ORIGIN environment variable is required');
  }
  app.enableCors({
    origin: corsOrigin.split(',').map(origin => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  });

  // Get services for dependency injection
  const errorHandlerService = app.get(ErrorHandlerService);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter(errorHandlerService));

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('VulHub Leaderboard API')
    .setDescription('A modular, secure, and gamified platform for cybersecurity students')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('projects', 'Project management')
    .addTag('submissions', 'Submission handling')
    .addTag('leaderboards', 'Leaderboard data')
    .addTag('badges', 'Badge system')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Health check endpoint (legacy - use /api/v1/health instead)
  app.use('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'API is running successfully!',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Readiness check for load balancers
  app.use('/ready', (req, res) => {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Simple test endpoint
  app.use('/test', (req, res) => {
    res.json({
      message: 'API test endpoint is working!',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  const port = configService.get('app.port', 4000);
  const host = process.env.HOST || '0.0.0.0';
  const shutdownTimeout = configService.get('app.shutdownTimeout', 10000);

  await app.listen(port, host);

  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  logger.log(`🚀 Application is running on: http://${displayHost}:${port}`);
  logger.log(`📚 API Documentation: http://${displayHost}:${port}/api/docs`);
  logger.log(`🏥 Health Check: http://${displayHost}:${port}/health`);
  logger.log(`✅ Readiness Check: http://${displayHost}:${port}/ready`);
  logger.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📊 Version: ${process.env.npm_package_version || '1.0.0'}`);

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    logger.log(`📴 Received ${signal}, starting graceful shutdown...`);

    try {
      // Close the HTTP server
      await app.close();
      logger.log('✅ HTTP server closed successfully');

      // Additional cleanup can be added here
      // - Close database connections
      // - Close Redis connections
      // - Close external service connections
      // - Flush logs

      logger.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
}

bootstrap().catch((error) => {
  console.error('❌ Error starting application:', error);
  console.error('🔍 Check your environment configuration and try again');
  console.error('📖 See CONFIGURATION_GUIDE.md for setup instructions');
  process.exit(1);
});
