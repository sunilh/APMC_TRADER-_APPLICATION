# Quick Deployment Guide - APMC Trading System

## Choose Your Platform

### Option 1: Render (Recommended for Beginners)
**Cost: ~$7-25/month + Domain**

#### Setup Steps:
1. **Database Setup (5 minutes)**
   - Go to console.neon.tech
   - Create project → Copy connection string
   - Format: `postgresql://user:pass@ep-xxx.region.neon.tech/db?sslmode=require`

2. **Deploy to Render (10 minutes)**
   - Go to render.com → New → Web Service
   - Connect GitHub repository
   - Settings:
     ```
     Name: apmc-trading-system
     Environment: Node
     Build Command: npm install && npm run db:push && vite build && esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js --external:pg-native
     Start Command: npm start
     ```

3. **Environment Variables**
   ```bash
   DATABASE_URL=your_neon_connection_string
   SESSION_SECRET=create-32-character-random-string
   NODE_ENV=production
   ```

4. **Custom Domain (Optional)**
   - Render Dashboard → Custom Domains → Add domain
   - Configure DNS: CNAME @ → your-app.onrender.com

---

### Option 2: Vercel (Recommended for Advanced Users)
**Cost: ~$20/month + Domain**

#### Setup Steps:
1. **Database Setup (Same as Render)**
   - Use Neon connection string

2. **Deploy to Vercel (5 minutes)**
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

3. **Environment Variables in Vercel Dashboard**
   ```bash
   DATABASE_URL=your_neon_connection_string
   SESSION_SECRET=create-32-character-random-string
   NODE_ENV=production
   ```

---

## Essential Environment Variables

Copy these into your deployment platform:

```bash
# Required
DATABASE_URL=postgresql://username:password@ep-xxx.region.neon.tech/database?sslmode=require
SESSION_SECRET=minimum-32-character-secure-random-string-here
NODE_ENV=production

# Auto-extracted (optional)
PGHOST=ep-xxx.region.neon.tech
PGDATABASE=your_database_name
PGUSER=your_username
PGPASSWORD=your_password
PGPORT=5432

# Optional
OPENAI_API_KEY=sk-xxx (if using AI features)
```

## Domain Setup (Optional)

1. **Buy Domain**: Any registrar (Namecheap, GoDaddy, etc.)
2. **DNS Configuration**:
   - **Render**: CNAME @ → your-app.onrender.com
   - **Vercel**: A @ → 76.76.19.61, CNAME www → cname.vercel-dns.com

## Cost Breakdown

| Platform | Service | Storage | Domain | Total/Month |
|----------|---------|---------|--------|-------------|
| Render   | $7-25   | $0-19   | $1/mo  | $8-45       |
| Vercel   | $20     | $0-19   | $1/mo  | $21-40      |

## Testing Your Deployment

1. **Health Check**: Visit `https://your-domain.com/api/health`
2. **Login Test**: Create admin user and test authentication
3. **Database Test**: Create farmer/buyer, generate invoice
4. **Performance**: Page loads < 3 seconds

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check Node.js version (v18+) |
| Database error | Verify DATABASE_URL format |
| App won't start | Check all environment variables set |
| SSL errors | Wait 24 hours for certificate propagation |

## Files Already Configured

✅ `vercel.json` - Vercel deployment configuration
✅ `render.yaml` - Render deployment configuration  
✅ `/api/health` - Health check endpoint
✅ Database migrations via `npm run db:push`

## Next Steps After Deployment

1. Test all functionality (farmers, lots, billing)
2. Configure backup strategy
3. Set up monitoring
4. Train users on the system

Your APMC Trading System will be live at your custom domain or platform URL!