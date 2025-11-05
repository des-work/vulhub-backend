import { registerAs } from '@nestjs/config';

export default registerAs('production', () => ({
  // Application settings
  app: {
    name: 'VulHub Leaderboard API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
  },

  // Database settings
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000', 10),
    ssl: process.env.DB_SSL === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },

  // Redis settings
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
    enableReadyCheck: true,
    lazyConnect: true,
  },

  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'vulhub-api',
    audience: process.env.JWT_AUDIENCE || 'vulhub-client',
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Requested-With',
      'X-Forwarded-For',
      'X-Real-IP',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Security settings
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET,
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    cookieSameSite: process.env.COOKIE_SAME_SITE || 'strict',
    trustProxy: process.env.TRUST_PROXY === 'true',
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    },
  },

  // Monitoring settings
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metricsEndpoint: process.env.METRICS_ENDPOINT || '/metrics',
    healthCheckEndpoint: process.env.HEALTH_ENDPOINT || '/health',
    logLevel: process.env.LOG_LEVEL || 'info',
    logFormat: process.env.LOG_FORMAT || 'json',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
  },

  // Email settings
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    from: process.env.EMAIL_FROM || 'noreply@vulhub.com',
  },

  // File storage settings
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    local: {
      uploadPath: process.env.UPLOAD_PATH || './uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
      allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
      ],
    },
    s3: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET,
      endpoint: process.env.S3_ENDPOINT,
    },
  },

  // WebSocket settings
  websocket: {
    cors: {
      origin: process.env.WS_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '1000', 10),
    connectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT || '30000', 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000', 10),
  },

  // Cache settings
  cache: {
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '3600', 10),
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '10000', 10),
    cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '3600000', 10), // 1 hour
  },

  // Feature flags
  features: {
    enableWebSockets: process.env.ENABLE_WEBSOCKETS === 'true',
    enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    enableFileUploads: process.env.ENABLE_FILE_UPLOADS === 'true',
    enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
  },

  // Performance settings
  performance: {
    maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '1048576', 10), // 1MB
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '5000', 10),
    headersTimeout: parseInt(process.env.HEADERS_TIMEOUT || '40000', 10),
  },
}));
