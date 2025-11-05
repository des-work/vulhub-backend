import { registerAs } from '@nestjs/config';

export const configuration = registerAs('app', () => ({
  // Application
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000'),

  // Database
  database: {
    url: process.env.DATABASE_URL || (process.env.VERCEL 
      ? 'file:/tmp/vulhub.db' 
      : process.env.NODE_ENV === 'production' 
        ? undefined 
        : 'file:./prisma/dev.db'),
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
    connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000', 10),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-jwt-secret-key-change-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-refresh-secret-key-change-in-production'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Rate limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // File upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
    ],
    scanForViruses: process.env.SCAN_FOR_VIRUSES === 'true',
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET,
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  },
}));
