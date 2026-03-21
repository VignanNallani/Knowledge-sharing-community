# Production Docker Setup

This directory contains a production-grade Dockerized setup for the Knowledge Sharing Community backend.

## 🐳 Docker Components

### Dockerfile
- **Multi-stage build** for optimized production image
- **Node.js 20 Alpine** base image
- **Non-root user** for security
- **Health checks** for monitoring
- **Prisma client generation** during build

### docker-compose.yml
- **API Service** with connection pooling
- **PostgreSQL 15 Alpine** with 8GB RAM tuning
- **Health checks** for both services
- **Proper networking** and volume management

## 🚀 Quick Start

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Database Configuration

### Connection Pool Safety
- **Connection Limit**: 5 connections per container
- **Pool Timeout**: 20 seconds
- **Database**: `knowledge_db`
- **User**: `postgres`

### PostgreSQL Tuning (8GB RAM)
- `shared_buffers=512MB`
- `work_mem=16MB`
- `effective_cache_size=2GB`
- `max_connections=100`
- `maintenance_work_mem=128MB`

## 🔧 Environment Variables

Production DATABASE_URL includes connection pooling:
```
postgresql://postgres:postgres@postgres:5432/knowledge_db?connection_limit=5&pool_timeout=20
```

## 🏥 Health Checks

### API Health Check
- **Endpoint**: `/health`
- **Interval**: 30s
- **Timeout**: 10s
- **Retries**: 3

### PostgreSQL Health Check
- **Command**: `pg_isready -U postgres -d knowledge_db`
- **Interval**: 10s
- **Timeout**: 5s
- **Retries**: 5

## 🚦 Production Migration Flow

The application uses `prisma migrate deploy` for production:
1. **Safe**: Only applies pending migrations
2. **Idempotent**: Safe to run multiple times
3. **No Dev Tools**: Doesn't use `migrate dev` in production

## 📁 File Structure

```
backend/
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Production orchestration
├── .dockerignore          # Docker build exclusions
└── DOCKER_README.md       # This documentation
```

## 🔒 Security Features

- **Non-root user** (nodejs:1001)
- **Minimal attack surface** (Alpine Linux)
- **No dev dependencies** in production image
- **Controlled database access** with connection limits
- **Health monitoring** for early failure detection

## 📈 Scaling Considerations

- Each container limited to 5 DB connections
- PostgreSQL configured for 100 max connections
- Supports up to 20 API containers safely
- Connection pooling prevents DB overload

## 🛠️ Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Command | `npm run dev` | `npm run start:prod` |
| Migrations | `prisma migrate dev` | `prisma migrate deploy` |
| Build | None | Multi-stage Docker |
| User | Root | Non-root (nodejs) |
| Monitoring | Basic | Health checks + logs |
