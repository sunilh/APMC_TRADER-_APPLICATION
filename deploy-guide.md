# Deployment Guide for APMC Trading System

## Platform Options

### 1. Render (Recommended)
**Best for**: Full-stack applications with PostgreSQL

**Steps**:
1. Create GitHub repository and push your code
2. Sign up at [render.com](https://render.com)
3. Create new Web Service, connect GitHub repo
4. Use these settings:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment Variables:
     ```
     NODE_ENV=production
     DATABASE_URL=your_postgres_connection_string
     SESSION_SECRET=random_secret_key_here
     ```
5. Create PostgreSQL database in Render
6. Run `npm run db:push` after deployment

**Cost**: Free tier available, $7/month for paid plans

### 2. Railway
**Best for**: Simple deployment with database

**Steps**:
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add PostgreSQL: `railway add postgresql`
5. Deploy: `railway up`

**Environment Variables**:
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
SESSION_SECRET=your_secret
```

### 3. Vercel (Frontend) + Neon (Database)
**Best for**: Serverless deployment

**Steps**:
1. Create account at [vercel.com](https://vercel.com)
2. Create PostgreSQL database at [neon.tech](https://neon.tech)
3. Install Vercel CLI: `npm install -g vercel`
4. Deploy: `vercel --prod`
5. Set environment variables in Vercel dashboard

### 4. Heroku
**Best for**: Traditional cloud deployment

**Steps**:
1. Install Heroku CLI
2. Create Heroku app: `heroku create your-app-name`
3. Add PostgreSQL: `heroku addons:create heroku-postgresql:mini`
4. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=your_secret
   ```
5. Deploy: `git push heroku main`

### 5. Docker + Any Cloud Provider

**Using the provided Dockerfile**:
```bash
# Build image
docker build -t apmc-app .

# Run locally
docker run -p 5000:5000 apmc-app

# Deploy to Docker Hub
docker tag apmc-app your-username/apmc-app
docker push your-username/apmc-app
```

Then deploy to:
- **AWS ECS/EKS**
- **Google Cloud Run**
- **Azure Container Instances**
- **DigitalOcean App Platform**

## Environment Variables Required

All platforms need these environment variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your_random_secret_key_minimum_32_characters
```

## Database Setup

After deployment, run:
```bash
npm run db:push
```

This creates all required tables for:
- Multi-tenant system
- User management
- Farmers, lots, bags, buyers
- Billing and tax records
- Sessions storage

## Post-Deployment Checklist

1. **Test Login**: Use superadmin/password
2. **Create Tenant**: Set up your first APMC organization
3. **Add Staff**: Create admin and staff users
4. **Test Features**: 
   - Farmer registration
   - Lot creation with voice input
   - Bag entry and weighing
   - Bill generation
   - Tax reports

## Performance Optimization

For production deployment:

1. **Database Indexing**: Already optimized in schema
2. **Static File Serving**: Express serves from dist folder
3. **Session Storage**: PostgreSQL-based sessions
4. **Caching**: Query optimization with Drizzle ORM

## Security Features

- ✅ Password hashing with bcrypt
- ✅ HTTPS-only cookies in production
- ✅ Session-based authentication
- ✅ Multi-tenant data isolation
- ✅ SQL injection protection with Drizzle ORM

## Mobile Compatibility

The application works perfectly on mobile devices:
- Responsive design
- Touch-friendly interface
- Voice input support
- Mobile printing with downloadable HTML
- Offline capability with auto-sync

## Support

Your APMC agricultural trading system includes:
- Complete farmer and buyer management
- Multi-lot billing system
- Tax compliance (GST/CESS reporting)
- Voice input in 3 languages
- Professional invoice generation
- Mobile-optimized printing
- Smart navigation structure

All features work seamlessly across all deployment platforms.