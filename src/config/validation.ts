import Joi from 'joi';

export const validationSchema = Joi.object({
  // Core Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number()
    .integer()
    .min(1)
    .max(65535)
    .default(4000),
  HOST: Joi.string()
    .default('0.0.0.0'),
  CORS_ORIGIN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().default('http://localhost:3000')
  }),

  // Database (SQLite or PostgreSQL)
  DATABASE_URL: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional().default('file:./prisma/dev.db')
    })
    .custom((value, helpers) => {
      // SQLite file paths
      if (value.startsWith('file:')) {
        const pattern = /^file:(\.\/|\/tmp\/|\/var\/|\.\/prisma\/).+\.db$/;
        if (!pattern.test(value)) {
          return helpers.error('string.pattern.base', {
            pattern: 'file:./path/to/db.db or file:/tmp/db.db'
          });
        }
        return value;
      }
      // PostgreSQL URLs
      if (value.startsWith('postgresql://')) {
        const pattern = /^postgresql:\/\/.+:.+@.+:\d+\/.+$/;
        if (!pattern.test(value)) {
          return helpers.error('string.pattern.base', {
            pattern: 'postgresql://user:password@host:port/database'
          });
        }
        return value;
      }
      return helpers.error('string.custom', {
        message: 'DATABASE_URL must start with file: or postgresql://'
      });
    }),
  DATABASE_MAX_CONNECTIONS: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),
  DATABASE_CONNECTION_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(120000)
    .default(30000),

  // JWT Security
  JWT_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional().default('dev-jwt-secret-key-change-in-production')
    }),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('15m'),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional().default('dev-refresh-secret-key-change-in-production')
    }),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('7d'),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number()
    .integer()
    .min(1000)
    .max(3600000)
    .default(60000),
  RATE_LIMIT_MAX: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(100),

  // File Upload
  MAX_FILE_SIZE: Joi.number()
    .integer()
    .min(1024)
    .max(1073741824)
    .default(10485760),
  SCAN_FOR_VIRUSES: Joi.boolean()
    .default(false),

  // Security
  BCRYPT_ROUNDS: Joi.number()
    .integer()
    .min(8)
    .max(20)
    .default(12),
  SESSION_SECRET: Joi.string()
    .min(32)
    .optional(),
  COOKIE_SECURE: Joi.boolean()
    .default(true),
  COOKIE_SAME_SITE: Joi.string()
    .valid('strict', 'lax', 'none')
    .default('lax'),

  // Logging & Timeouts
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  REQUEST_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(300000)
    .default(30000),
  SHUTDOWN_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(10000),
});
