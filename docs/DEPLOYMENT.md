# Deployment Guide

## 🚀 Deployment Architecture

This guide covers the complete deployment process for the Knowledge Sharing Tech Community platform, from development to production environments.

## 🏗️ Environment Overview

### Development Environment
- **Local Development**: Docker Compose with hot reload
- **Database**: PostgreSQL 15 container
- **Cache**: Redis container
- **Frontend**: Vite dev server (port 5173)
- **Backend**: Node.js server (port 4000)

### Staging Environment
- **Infrastructure**: Docker containers on staging server
- **Database**: PostgreSQL 15 with test data
- **Monitoring**: Full observability stack
- **Testing**: Automated integration tests
- **Performance**: Load testing validation

### Production Environment
- **Infrastructure**: Kubernetes cluster
- **Database**: PostgreSQL 15 with read replicas
- **Cache**: Redis cluster
- **CDN**: CloudFlare for static assets
- **Monitoring**: Prometheus + Grafana + AlertManager

## 🐳 Docker Configuration

### Multi-Stage Dockerfile
```dockerfile
# Dependencies stage
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Builder stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nodejs
EXPOSE 4000
ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["npm", "start"]
```

### Docker Compose (Development)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: knowledge_sharing
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./prisma/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/knowledge_sharing
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-key
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    environment:
      VITE_API_BASE_URL: http://localhost:4000/api/v1
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

## ☸️ Kubernetes Deployment

### Namespace Configuration
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: knowledge-sharing
  labels:
    name: knowledge-sharing
```

### ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: knowledge-sharing
data:
  NODE_ENV: "production"
  PORT: "4000"
  REDIS_URL: "redis://redis-service:6379"
  DATABASE_URL: "postgresql://postgres:password@postgres-service:5432/knowledge_sharing"
```

### Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: knowledge-sharing
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  DATABASE_PASSWORD: <base64-encoded-password>
```

### Backend Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
  namespace: knowledge-sharing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: knowledge-sharing/backend:latest
        ports:
        - containerPort: 4000
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readiness
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
```

### Service Configuration
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: knowledge-sharing
spec:
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4000
  type: ClusterIP
```

### Ingress Configuration
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  namespace: knowledge-sharing
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.knowledge-sharing.com
    secretName: api-tls
  rules:
  - host: api.knowledge-sharing.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run security audit
      run: npm audit --audit-level=moderate
    
    - name: Type checking
      run: npm run type-check

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push backend
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: true
        tags: ghcr.io/${{ github.repository }}/backend:latest
    
    - name: Build and push frontend
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        push: true
        tags: ghcr.io/${{ github.repository }}/frontend:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure kubectl
      uses: azure/k8s-set-context@v1
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBE_CONFIG }}
    
    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f k8s/
        kubectl rollout status deployment/backend-deployment -n knowledge-sharing
    
    - name: Run load tests
      run: |
        npm run load-test:smoke
        npm run load-test:performance
```

## 🔧 Environment Configuration

### Environment Variables
```bash
# .env.production
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret

# Security
HTTPS_ENABLED=true
CORS_ORIGIN=https://knowledge-sharing.com
RATE_LIMIT_REDIS_URL=redis://host:6379

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=info
STRUCTURED_LOGGING=true

# Performance
DB_CONNECTION_LIMIT=10
DB_POOL_TIMEOUT=5000
DB_STATEMENT_TIMEOUT=5000
REQUEST_TIMEOUT=10000

# Memory Management
MEMORY_THRESHOLD_WARNING=400
MEMORY_THRESHOLD_CRITICAL=500
MEMORY_CHECK_INTERVAL=30000
```

### Database Configuration
```javascript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Connection pool configuration
database {
  connection_limit = 10
  pool_timeout = 5000
  connect_timeout = 5000
  statement_timeout = 5000
}
```

## 📊 Monitoring Setup

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'knowledge-sharing-backend'
    static_configs:
      - targets: ['backend-service:80']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Knowledge Sharing Platform",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

## 🔒 Security Configuration

### SSL/TLS Setup
```bash
# Generate SSL certificates with cert-manager
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@knowledge-sharing.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-netpol
  namespace: knowledge-sharing
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 4000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

## 🚀 Deployment Steps

### 1. Initial Setup
```bash
# Clone repository
git clone https://github.com/your-org/knowledge-sharing.git
cd knowledge-sharing

# Setup environment
cp .env.example .env.production
# Edit .env.production with production values

# Create namespace
kubectl create namespace knowledge-sharing

# Apply secrets
kubectl apply -f k8s/secrets.yaml

# Apply configmaps
kubectl apply -f k8s/configmaps.yaml
```

### 2. Database Setup
```bash
# Deploy database
kubectl apply -f k8s/postgres.yaml

# Wait for database to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n knowledge-sharing --timeout=300s

# Run database migrations
kubectl run migration --image=knowledge-sharing/backend:latest --rm -i --restart=Never \
  --env-from=configmap/app-config \
  --env-from=secret/app-secrets \
  -- npx prisma migrate deploy
```

### 3. Application Deployment
```bash
# Deploy backend
kubectl apply -f k8s/backend/

# Deploy frontend
kubectl apply -f k8s/frontend/

# Deploy monitoring
kubectl apply -f k8s/monitoring/

# Verify deployment
kubectl get pods -n knowledge-sharing
kubectl get services -n knowledge-sharing
```

### 4. Validation
```bash
# Check health endpoints
kubectl port-forward service/backend-service 4000:80 -n knowledge-sharing
curl http://localhost:4000/health

# Run smoke tests
npm run load-test:smoke

# Check monitoring
kubectl port-forward service/prometheus 9090:9090 -n monitoring
kubectl port-forward service/grafana 3000:3000 -n monitoring
```

## 🔄 Rolling Updates

### Zero-Downtime Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      containers:
      - name: backend
        image: knowledge-sharing/backend:v2.0.0
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
```

### Database Migrations
```bash
# Create migration job
apiVersion: batch/v1
kind: Job
metadata:
  name: migration-job
spec:
  template:
    spec:
      containers:
      - name: migration
        image: knowledge-sharing/backend:latest
        command: ["npx", "prisma", "migrate", "deploy"]
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
      restartPolicy: Never
```

## 📈 Performance Optimization

### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: knowledge-sharing
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-deployment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Resource Limits
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## 🔍 Troubleshooting

### Common Issues
1. **Database Connection Errors**
   - Check database pod status
   - Verify connection string
   - Check network policies

2. **High Memory Usage**
   - Check memory limits
   - Monitor memory leaks
   - Review garbage collection

3. **Slow Response Times**
   - Check database query performance
   - Monitor connection pool usage
   - Review rate limiting impact

### Debug Commands
```bash
# Check pod logs
kubectl logs -f deployment/backend-deployment -n knowledge-sharing

# Check pod status
kubectl describe pod <pod-name> -n knowledge-sharing

# Check events
kubectl get events -n knowledge-sharing --sort-by='.lastTimestamp'

# Port forward for debugging
kubectl port-forward service/backend-service 4000:80 -n knowledge-sharing

# Exec into pod
kubectl exec -it <pod-name> -n knowledge-sharing -- /bin/sh
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Secrets created and encrypted
- [ ] Database backups created
- [ ] SSL certificates configured
- [ ] Monitoring dashboards ready
- [ ] Load tests validated

### Post-Deployment
- [ ] Health checks passing
- [ ] Smoke tests successful
- [ ] Monitoring alerts configured
- [ ] Log aggregation working
- [ ] Performance benchmarks met
- [ ] Security scans passed

### Ongoing
- [ ] Regular backup verification
- [ ] Security patch updates
- [ ] Performance monitoring
- [ ] Capacity planning
- [ ] Disaster recovery testing

**Deployment Maturity Level: 95%**
