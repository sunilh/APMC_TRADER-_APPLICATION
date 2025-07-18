# Deployment Checklist for APMC Trading System

## Pre-Deployment Setup

### 1. Neon Database Setup
- [ ] Create Neon project at console.neon.tech
- [ ] Copy connection string (format: `postgresql://user:pass@host:5432/db?sslmode=require`)
- [ ] Test connection from local environment
- [ ] Note down all connection parameters:
  - `PGHOST`: ep-xxx.region.neon.tech
  - `PGDATABASE`: database_name
  - `PGUSER`: username
  - `PGPASSWORD`: password
  - `PGPORT`: 5432

### 2. Environment Variables Required
```bash
# Core Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# PostgreSQL Components (auto-extracted from DATABASE_URL)
PGHOST=ep-xxx.region.neon.tech
PGDATABASE=your_database_name
PGUSER=your_username
PGPASSWORD=your_password
PGPORT=5432

# Security
SESSION_SECRET=minimum-32-character-secure-random-string

# Environment
NODE_ENV=production

# Optional Features
OPENAI_API_KEY=sk-xxx (if using AI features)
```

### 3. Domain Setup (Optional)
- [ ] Purchase domain from registrar
- [ ] Configure DNS records
- [ ] SSL certificate (auto-provisioned by platform)

## Render Deployment Steps

### Step 1: Service Creation
1. Go to render.com → New → Web Service
2. Connect GitHub repository
3. Configure:
   - **Name**: apmc-trading-system
   - **Environment**: Node
   - **Region**: Oregon (or closest to users)
   - **Branch**: main
   - **Build Command**: `npm install && npm run db:push && vite build && esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js --external:pg-native`
   - **Start Command**: `npm start`

### Step 2: Environment Variables
Add all variables from section 2 above in Render Dashboard → Environment

### Step 3: Custom Domain (Optional)
1. Render Dashboard → Settings → Custom Domains
2. Add your domain
3. Configure DNS as instructed

### Step 4: Health Check
Add health endpoint to your server:
```typescript
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
```

## Vercel Deployment Steps

### Step 1: Vercel Setup
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`

### Step 2: Project Configuration
- Framework: Other
- Build Command: `vite build && esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js --external:pg-native`
- Output Directory: `dist`
- Install Command: `npm install`

### Step 3: Environment Variables
Add all variables in Vercel Dashboard → Project → Settings → Environment Variables

### Step 4: Custom Domain (Optional)
1. Vercel Dashboard → Domains
2. Add domain and follow DNS instructions

## Post-Deployment Verification

### 1. Application Health
- [ ] Visit deployed URL
- [ ] Test login functionality
- [ ] Create test farmer/buyer
- [ ] Generate sample invoice
- [ ] Verify database operations

### 2. Database Migration
- [ ] Confirm all tables are created
- [ ] Verify data integrity
- [ ] Test CRUD operations

### 3. Performance Checks
- [ ] Page load times < 3 seconds
- [ ] API response times < 1 second
- [ ] Database query performance
- [ ] Memory usage monitoring

### 4. Security Verification
- [ ] HTTPS enabled (SSL certificate)
- [ ] Environment variables secured
- [ ] Database connection encrypted
- [ ] Session management working

## Monitoring Setup

### 1. Application Monitoring
- [ ] Set up error tracking
- [ ] Configure performance monitoring
- [ ] Database connection monitoring
- [ ] Memory/CPU usage alerts

### 2. Backup Strategy
- [ ] Neon automatic backups enabled
- [ ] Environment variables backup
- [ ] Code repository backup

## Cost Optimization

### Render Pricing Tiers
- **Starter**: $7/month (512MB RAM, good for testing)
- **Standard**: $25/month (2GB RAM, recommended for production)
- **Professional**: $85/month (8GB RAM, high traffic)

### Vercel Pricing Tiers
- **Hobby**: $0/month (limited features)
- **Pro**: $20/month (recommended for production)
- **Enterprise**: Custom pricing

### Neon Pricing
- **Free**: 512MB storage, 1 database
- **Pro**: $19/month, 8GB storage, multiple databases

## Troubleshooting Common Issues

### Build Failures
- Check Node.js version compatibility (v18+)
- Verify all dependencies in package.json
- Review build logs for specific errors

### Database Connection Errors
- Verify DATABASE_URL format
- Check Neon database status
- Confirm SSL configuration

### Environment Variable Issues
- Ensure no typos in variable names
- Verify all required variables are set
- Check for special characters in values

### Performance Issues
- Enable connection pooling
- Optimize database queries
- Implement caching strategies

## Final Checklist Before Go-Live

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificate active
- [ ] Custom domain configured (if applicable)
- [ ] Health checks passing
- [ ] Error monitoring active
- [ ] Backup strategy implemented
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] User acceptance testing passed

## Emergency Rollback Plan

1. **Quick Rollback**: Revert to previous git commit
2. **Database Rollback**: Use Neon point-in-time recovery
3. **Environment Restoration**: Backup current environment variables
4. **Communication Plan**: Notify users of maintenance

Your APMC Trading System will be production-ready after completing this checklist!