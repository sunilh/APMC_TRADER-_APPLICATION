# Render Deployment Guide for APMC Trading System

## Prerequisites
- Render account (render.com)
- Neon PostgreSQL database
- Custom domain (optional)
- GitHub repository

## Step 1: Prepare Environment Variables

Create these environment variables in Render:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require

# Session Configuration  
SESSION_SECRET=your-super-secure-session-secret-here

# Node Environment
NODE_ENV=production

# Optional: OpenAI Integration
OPENAI_API_KEY=your-openai-api-key
```

## Step 2: Neon Database Setup

1. **Create Neon Project**
   - Go to console.neon.tech
   - Create new project
   - Select region closest to your users
   - Copy connection string

2. **Database Configuration**
   ```sql
   -- Your database will be automatically created
   -- Connection string format:
   postgresql://username:password@ep-xxx.region.neon.tech/database?sslmode=require
   ```

3. **Update Environment**
   - Use the Neon connection string as DATABASE_URL
   - Ensure SSL mode is enabled

## Step 3: Render Web Service Setup

1. **Connect Repository**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Service Configuration**
   ```yaml
   Name: apmc-trading-system
   Environment: Node
   Region: Oregon (US West) or closest to your users
   Branch: main
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

3. **Environment Variables**
   - Add all variables from Step 1
   - Ensure DATABASE_URL points to your Neon database

## Step 4: Build Configuration

Update `package.json` scripts:
```json
{
  "scripts": {
    "build": "npm run db:push && npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js --external:pg-native",
    "start": "node dist/index.js",
    "db:push": "drizzle-kit push"
  }
}
```

## Step 5: Database Migration

Add to your deployment:
```bash
# This runs automatically during build
npm run db:push
```

## Step 6: Custom Domain Setup

1. **Purchase Domain**
   - Any domain registrar (Namecheap, GoDaddy, etc.)

2. **Configure DNS**
   ```
   Type: CNAME
   Name: @ (or subdomain like app)
   Value: your-app-name.onrender.com
   TTL: 300
   ```

3. **Add Domain in Render**
   - Go to your service → Settings → Custom Domains
   - Add your domain
   - Render will automatically provision SSL certificate

## Step 7: Production Optimizations

Create `render.yaml` for infrastructure as code:
```yaml
databases:
  - name: apmc-db
    databaseName: apmc_production
    user: apmc_user
    region: oregon

services:
  - type: web
    name: apmc-trading-system
    env: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: apmc-db
          property: connectionString
      - key: NODE_ENV
        value: production
      - key: SESSION_SECRET
        generateValue: true
    domains:
      - your-domain.com
```

## Step 8: Monitoring & Scaling

1. **Health Checks**
   - Render automatically monitors your app
   - Configure custom health check endpoint if needed

2. **Scaling**
   - Start with Starter plan ($7/month)
   - Upgrade to Standard ($25/month) for production
   - Professional ($85/month) for high traffic

## Cost Estimation

- **Render Web Service**: $7-85/month
- **Neon Database**: $0-19/month (Free tier available)
- **Custom Domain**: $10-15/year
- **Total Monthly**: ~$7-104

## Deployment Commands

```bash
# 1. Push to GitHub
git add .
git commit -m "Deploy to Render"
git push origin main

# 2. Render auto-deploys from GitHub
# 3. Check deployment logs in Render dashboard
```

## Troubleshooting

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Review build logs in Render dashboard

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Ensure Neon database allows connections
   - Check SSL configuration

3. **Environment Variables**
   - Verify all required variables are set
   - Check for typos in variable names
   - Restart service after changes

## Security Considerations

1. **Environment Variables**
   - Never commit secrets to repository
   - Use Render's environment variable management
   - Rotate SESSION_SECRET periodically

2. **Database Security**
   - Use strong passwords
   - Enable connection pooling
   - Regular backups (Neon handles this)

Your APMC Trading System will be live at: `https://your-domain.com`