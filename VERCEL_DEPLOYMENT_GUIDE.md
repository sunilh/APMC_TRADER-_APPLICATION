# Vercel Deployment Guide for APMC Trading System

## Prerequisites
- Vercel account (vercel.com)
- Neon PostgreSQL database
- Custom domain (optional)
- GitHub repository

## Step 1: Project Configuration

Create `vercel.json` in project root:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["dist/**"]
      }
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/public"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/public/$1"
    }
  ],
  "functions": {
    "server/index.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Step 2: Neon Database Setup

1. **Create Neon Project**
   - Go to console.neon.tech
   - Create new project: "APMC Trading System"
   - Select region closest to your users
   - Copy connection string

2. **Database Configuration**
   ```bash
   # Connection string format:
   postgresql://username:password@ep-xxx.region.neon.tech/database?sslmode=require
   
   # Example:
   postgresql://apmc_user:abc123@ep-cool-tree-123456.us-east-1.neon.tech/apmc_db?sslmode=require
   ```

## Step 3: Environment Variables Setup

In Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require

# PostgreSQL specific (auto-extracted from DATABASE_URL)
PGHOST=ep-xxx.region.neon.tech
PGDATABASE=database_name
PGUSER=username
PGPASSWORD=password
PGPORT=5432

# Session Configuration
SESSION_SECRET=your-super-secure-session-secret-here-min-32-chars

# Node Environment
NODE_ENV=production

# Optional: OpenAI Integration
OPENAI_API_KEY=sk-xxx-your-openai-key
```

## Step 4: Build Configuration

Update `package.json`:
```json
{
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build --outDir dist/public",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=dist/server.js --external:pg-native --external:sharp",
    "start": "node dist/server.js",
    "vercel-build": "npm run build",
    "db:push": "drizzle-kit push"
  }
}
```

## Step 5: Serverless Function Configuration

Create `api/index.ts` for Vercel serverless:
```typescript
import { createServer } from '../server/index.js';

export default async function handler(req: any, res: any) {
  const server = await createServer();
  return server(req, res);
}
```

## Step 6: Database Migration Strategy

Create `scripts/deploy-db.js`:
```javascript
const { execSync } = require('child_process');

async function deployDatabase() {
  try {
    console.log('🚀 Running database migrations...');
    execSync('npm run db:push', { stdio: 'inherit' });
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

deployDatabase();
```

## Step 7: Deployment Steps

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Initialize project
   vercel init
   ```

2. **Configure Project**
   - Framework Preset: Other
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist/public`
   - Install Command: `npm install`

3. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod
   
   # Or push to main branch for auto-deployment
   git push origin main
   ```

## Step 8: Custom Domain Setup

1. **Purchase Domain**
   - Any registrar (Namecheap, GoDaddy, etc.)

2. **Add Domain in Vercel**
   - Go to Project → Settings → Domains
   - Add your domain: `your-domain.com`
   - Follow DNS configuration instructions

3. **DNS Configuration**
   ```
   Type: A
   Name: @
   Value: 76.76.19.61
   
   Type: CNAME  
   Name: www
   Value: cname.vercel-dns.com
   ```

## Step 9: Environment-Specific Configuration

Create `next.config.js` (even for non-Next.js):
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'drizzle-orm']
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
  }
}

module.exports = nextConfig
```

## Step 10: Production Optimizations

1. **Function Configuration**
   ```json
   {
     "functions": {
       "api/*.ts": {
         "maxDuration": 30,
         "memory": 1024
       }
     }
   }
   ```

2. **Caching Strategy**
   ```javascript
   // In your API routes
   res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
   ```

## Cost Estimation

- **Vercel Pro**: $20/month (required for team features)
- **Neon Database**: $0-19/month (Free tier: 512MB)
- **Custom Domain**: $10-15/year
- **Total Monthly**: ~$20-39

## Monitoring & Analytics

1. **Vercel Analytics**
   ```bash
   npm install @vercel/analytics
   ```

2. **Add to your app**
   ```typescript
   import { Analytics } from '@vercel/analytics/react';
   
   export default function App() {
     return (
       <>
         <YourApp />
         <Analytics />
       </>
     );
   }
   ```

## Deployment Commands

```bash
# Quick deployment
vercel

# Production deployment
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs your-deployment-url
```

## Troubleshooting

1. **Serverless Function Timeouts**
   - Increase maxDuration in vercel.json
   - Optimize database queries
   - Use connection pooling

2. **Build Failures**
   - Check build logs in Vercel dashboard
   - Verify all dependencies are production-ready
   - Test build locally first

3. **Database Connection Issues**
   - Verify Neon connection string
   - Check SSL requirements
   - Test connection in development

## Security Best Practices

1. **Environment Variables**
   - Use Vercel's encrypted environment variables
   - Never commit secrets to repository
   - Use different secrets for preview/production

2. **Database Security**
   - Enable Neon's IP allowlist if needed
   - Use connection pooling
   - Regular security updates

Your APMC Trading System will be live at: `https://your-domain.com`

## Advanced Features

1. **Preview Deployments**
   - Every git push creates a preview
   - Test features before production

2. **Edge Functions**
   - Use for authentication middleware
   - Geo-located responses

3. **Image Optimization**
   - Automatic image optimization
   - WebP conversion