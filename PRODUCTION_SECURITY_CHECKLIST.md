# 🔒 Production Security Checklist

## Backend Security

### ✅ Environment Variables
- [ ] JWT_SECRET: Strong 32+ character random string
- [ ] DATABASE_URL: Production PostgreSQL with SSL
- [ ] CORS_ORIGIN: Locked to frontend domain only
- [ ] REDIS_URL: Production Redis instance

### ✅ Rate Limiting
- [ ] Login endpoint: 5 requests per minute
- [ ] API endpoints: 100 requests per 15 minutes
- [ ] Password reset: 3 requests per hour

### ✅ Headers & Security
- [ ] Helmet.js security headers implemented
- [ ] CORS locked to production domain
- [ ] Prisma debug logs disabled in production
- [ ] Console.log statements removed

### ✅ Authentication
- [ ] JWT expiration: 15 minutes
- [ ] Refresh token expiration: 7 days
- [ ] Password requirements: 8+ chars, uppercase, special
- [ ] Account lockout: 5 failed attempts

## Frontend Security

### ✅ Environment Variables
- [ ] VITE_API_BASE_URL: Production backend URL
- [ ] VITE_SOCKET_URL: Production WebSocket URL
- [ ] No hardcoded localhost URLs

### ✅ Token Management
- [ ] Secure storage: httpOnly cookies or secure storage
- [ ] Auto-logout on token expiration
- [ ] Token refresh flow implemented
- [ ] Clear tokens on logout

## Deployment Security

### ✅ Infrastructure
- [ ] HTTPS enforced
- [ ] Database firewall configured
- [ ] Backup strategy implemented
- [ ] Monitoring and logging enabled

### ✅ Testing
- [ ] Security audit completed
- [ ] Penetration testing passed
- [ ] Load testing completed
- [ ] Error handling verified

---

## 🚀 Production Deployment Commands

### Backend (Railway/Render)
```bash
# Set production environment
export NODE_ENV=production
export JWT_SECRET=your-secure-secret
export DATABASE_URL=your-production-db-url

# Deploy
npm run build
npm start
```

### Frontend (Vercel)
```bash
# Set production environment
# Vercel automatically sets VITE_API_BASE_URL

# Deploy
npm run build
vercel --prod
```

---

## 🎯 Critical Security Notes

1. **Never commit .env files** - Use platform secrets
2. **Use HTTPS everywhere** - No HTTP in production
3. **Validate all inputs** - SQL injection prevention
4. **Monitor logs** - Security incident detection
5. **Update dependencies** - Security patch management

---

## 📊 Production Metrics to Monitor

- Response times < 200ms
- Error rate < 1%
- Memory usage < 512MB
- CPU usage < 70%
- Database connections < 80% of pool

---

**Status: Ready for deployment after checklist completion**
