# 🔧 Configuration Guide

**Comprehensive setup and configuration guide for VulHub API**

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Configuration Validation](#configuration-validation)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [Security Configuration](#security-configuration)
- [External Services](#external-services)
- [Monitoring Setup](#monitoring-setup)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Development Setup

1. **Copy environment template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Configure minimal variables**:
   ```env
   NODE_ENV=development
   PORT=4000
   CORS_ORIGIN=http://localhost:3000
   DATABASE_URL=file:./dev.db  # SQLite for local dev
   JWT_SECRET=dev-jwt-secret-key-change-in-production
   JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production
   ```

3. **Start the API**:
   ```bash
   npm run start:dev
   ```

### Production Setup

1. **Set required production variables**:
   ```env
   NODE_ENV=production
   PORT=4000
   CORS_ORIGIN=https://yourdomain.com
   DATABASE_URL=postgresql://user:pass@host:5432/db
   JWT_SECRET=your-secure-jwt-secret-min-32-chars
   JWT_REFRESH_SECRET=your-secure-refresh-secret-min-32-chars
   ```

2. **Validate configuration**:
   ```bash
   curl http://localhost:4000/api/v1/health/config
   ```

---

## 🔧 Environment Variables

### Core Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | `development` | Environment (`development`, `production`, `test`) |
| `PORT` | ❌ | `4000` | Server port (1-65535) |
| `HOST` | ❌ | `0.0.0.0` | Server host binding |
| `CORS_ORIGIN` | ✅ (prod) | `http://localhost:3000` | Allowed CORS origins |

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ (prod) | `file:./dev.db` | Database connection URL |
| `DATABASE_MAX_CONNECTIONS` | ❌ | `10` | Maximum database connections |
| `DATABASE_CONNECTION_TIMEOUT` | ❌ | `30000` | Connection timeout (ms) |

**Database URL Formats**:
- **SQLite (Development)**: `file:./dev.db`
- **PostgreSQL**: `postgresql://user:pass@host:5432/database`
- **MySQL**: `mysql://user:pass@host:3306/database`

### Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | ❌ | `localhost` | Redis server host |
| `REDIS_PORT` | ❌ | `6379` | Redis server port |
| `REDIS_PASSWORD` | ❌ | - | Redis password (if required) |
| `REDIS_DB` | ❌ | `0` | Redis database number |
| `REDIS_KEY_PREFIX` | ❌ | `vulhub:` | Redis key prefix |

### Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ (prod) | `dev-jwt-secret-key-change-in-production` | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | ❌ | `15m` | JWT expiration time |
| `JWT_REFRESH_SECRET` | ✅ (prod) | `dev-refresh-secret-key-change-in-production` | Refresh token secret (min 32 chars) |
| `JWT_REFRESH_EXPIRES_IN` | ❌ | `7d` | Refresh token expiration |
| `BCRYPT_ROUNDS` | ❌ | `12` | Password hashing rounds (8-20) |
| `SESSION_SECRET` | ❌ | - | Session secret (min 32 chars) |

### Storage

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_PROVIDER` | ❌ | `minio` | Storage provider (`minio`, `s3`, `local`) |
| `MINIO_ENDPOINT` | ✅ (minio) | `localhost` | MinIO server endpoint |
| `MINIO_PORT` | ❌ | `9000` | MinIO server port |
| `MINIO_ACCESS_KEY` | ✅ (minio) | - | MinIO access key |
| `MINIO_SECRET_KEY` | ✅ (minio) | - | MinIO secret key |
| `MINIO_BUCKET` | ❌ | `vulhub-uploads` | MinIO bucket name |

### Email

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | ❌ | `localhost` | SMTP server host |
| `SMTP_PORT` | ❌ | `587` | SMTP server port |
| `SMTP_SECURE` | ❌ | `false` | Use SSL/TLS |
| `SMTP_USER` | ✅ (if SMTP_HOST) | - | SMTP username |
| `SMTP_PASS` | ✅ (if SMTP_HOST) | - | SMTP password |
| `SMTP_FROM` | ❌ | `noreply@vulhub.edu` | From email address |

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_TTL` | ❌ | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | ❌ | `100` | Max requests per window |

### File Upload

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_FILE_SIZE` | ❌ | `10485760` | Max file size (bytes) |
| `SCAN_FOR_VIRUSES` | ❌ | `false` | Enable virus scanning |

### Monitoring

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONITORING_ENABLED` | ❌ | `false` | Enable OpenTelemetry |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ✅ (monitoring) | - | OTLP endpoint URL |
| `OTEL_SERVICE_NAME` | ❌ | `vulhub-api` | Service name |

---

## ✅ Configuration Validation

The API automatically validates your configuration on startup and provides detailed feedback.

### Check Configuration Status

```bash
# Get validation results
curl http://localhost:4000/api/v1/health/config
```

**Response**:
```json
{
  "isValid": true,
  "errors": [],
  "warnings": [
    {
      "field": "SMTP_HOST",
      "message": "Email functionality may not work without SMTP configuration",
      "suggestion": "Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS for email features"
    }
  ],
  "recommendations": []
}
```

### Validation Levels

- **🚨 Critical**: Prevents startup (e.g., missing JWT_SECRET in production)
- **⚠️ High**: Major issues (e.g., invalid DATABASE_URL format)
- **🟡 Medium**: Configuration problems (e.g., weak JWT secret)
- **ℹ️ Low**: Optimization suggestions

---

## 🗄️ Database Setup

### SQLite (Development)

1. **Install SQLite** (if needed):
   ```bash
   # Already included in dependencies
   ```

2. **Set DATABASE_URL**:
   ```env
   DATABASE_URL=file:./dev.db
   ```

3. **Run migrations**:
   ```bash
   npx prisma migrate dev
   ```

### PostgreSQL (Production)

1. **Install PostgreSQL**:
   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib

   # macOS
   brew install postgresql
   ```

2. **Create database**:
   ```sql
   CREATE DATABASE vulhub_prod;
   CREATE USER vulhub_user WITH ENCRYPTED PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE vulhub_prod TO vulhub_user;
   ```

3. **Set DATABASE_URL**:
   ```env
   DATABASE_URL=postgresql://vulhub_user:secure_password@localhost:5432/vulhub_prod
   ```

4. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```

---

## 🔴 Redis Setup

### Local Redis (Development)

1. **Install Redis**:
   ```bash
   # Ubuntu/Debian
   sudo apt install redis-server

   # macOS
   brew install redis
   ```

2. **Start Redis**:
   ```bash
   redis-server
   ```

3. **Default configuration** (optional):
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Redis Cloud/Managed (Production)

1. **Get Redis URL** from your provider (e.g., Redis Labs, AWS ElastiCache)

2. **Set configuration**:
   ```env
   REDIS_HOST=your-redis-host.com
   REDIS_PORT=12345
   REDIS_PASSWORD=your-redis-password
   ```

---

## 🔐 Security Configuration

### JWT Secrets

**Generate secure secrets**:
```bash
# Linux/macOS
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Set in environment**:
```env
JWT_SECRET=your-32-character-or-longer-jwt-secret-here
JWT_REFRESH_SECRET=your-32-character-or-longer-refresh-secret-here
```

### Password Security

```env
BCRYPT_ROUNDS=12  # Higher = more secure but slower
SESSION_SECRET=your-32-character-session-secret-here
```

---

## 📧 Email Configuration

### Local Development (MailHog)

1. **Install MailHog**:
   ```bash
   # Download and run
   wget https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_linux_amd64
   chmod +x MailHog_linux_amd64
   ./MailHog_linux_amd64
   ```

2. **Set configuration**:
   ```env
   SMTP_HOST=localhost
   SMTP_PORT=1025
   ```

3. **Access web interface**: http://localhost:8025

### Production (SMTP)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@vulhub.edu
```

---

## 📊 Monitoring Setup

### OpenTelemetry

1. **Enable monitoring**:
   ```env
   MONITORING_ENABLED=true
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
   OTEL_SERVICE_NAME=vulhub-api
   ```

2. **Run Jaeger** (for local development):
   ```bash
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 14268:14268 \
     jaegertracing/all-in-one:latest
   ```

3. **Access Jaeger UI**: http://localhost:16686

### Health Check Endpoints

- **Basic Health**: `GET /api/v1/health`
- **Readiness**: `GET /api/v1/health/ready`
- **Liveness**: `GET /api/v1/health/live`
- **Detailed**: `GET /api/v1/health/detailed`
- **Config**: `GET /api/v1/health/config`
- **Metrics**: `GET /api/v1/health/metrics`

---

## 🔍 Troubleshooting

### Common Issues

#### ❌ "Environment validation failed"

**Check validation results**:
```bash
curl http://localhost:4000/api/v1/health/config
```

**Fix critical errors first** - they prevent startup.

#### ❌ "Database connection failed"

**Test database connection**:
```bash
# For PostgreSQL
psql "postgresql://user:pass@host:5432/db" -c "SELECT 1"

# For SQLite
sqlite3 dev.db "SELECT 1"
```

#### ❌ "Redis connection failed"

**Test Redis connection**:
```bash
redis-cli -h localhost -p 6379 ping
```

**Response should be**: `PONG`

#### ❌ "JWT token invalid"

**Check JWT secrets**:
- Must be at least 32 characters
- Different secrets for JWT and refresh tokens
- Use secure random strings in production

### Debug Mode

Enable detailed logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Environment File Priority

1. `.env.local` (highest priority)
2. `.env`
3. System environment variables
4. Default values (lowest priority)

---

## 📝 Environment File Templates

### Development (.env.local)

```env
# Core
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000

# Database (SQLite)
DATABASE_URL=file:./dev.db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=dev-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production

# Email (optional)
SMTP_HOST=localhost
SMTP_PORT=1025
```

### Production (.env)

```env
# Core
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_HOST=your-redis-host.com
REDIS_PORT=12345
REDIS_PASSWORD=your-redis-password

# Security
JWT_SECRET=your-secure-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-secure-refresh-secret-min-32-chars
BCRYPT_ROUNDS=12

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring (optional)
MONITORING_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-endpoint.com
```

---

## 🎯 Validation Checklist

Before deploying to production:

- [ ] ✅ Environment validation passes (`/health/config`)
- [ ] ✅ Database connection works
- [ ] ✅ Redis connection works
- [ ] ✅ JWT secrets are secure (32+ characters)
- [ ] ✅ CORS_ORIGIN is set for production domain
- [ ] ✅ All required production variables are set
- [ ] ✅ Health checks return healthy status
- [ ] ✅ No critical validation errors

---

**Need Help?** Check the health endpoints and validation results for detailed guidance.
