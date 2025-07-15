# Google Cloud Deployment Guide for APMC Trading Application

## Quick Start Deployment

### Prerequisites
1. **Google Cloud Account** with billing enabled
2. **Google Cloud SDK** installed and configured
3. **Docker** installed (for local builds)
4. **Project ID** chosen (e.g., `apmc-trading-system`)

### Option 1: Automated Setup (Recommended)
```bash
# Clone or download the project
# Navigate to project directory

# Run the complete setup script
./deploy-scripts/gcp-setup.sh your-project-id

# This will:
# - Enable all required APIs
# - Create Cloud SQL database
# - Set up storage bucket
# - Store secrets in Secret Manager
# - Build and deploy the application
```

### Option 2: Manual Step-by-Step Deployment

#### Step 1: Setup Google Cloud Project
```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Set project
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    storage.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com
```

#### Step 2: Create Database
```bash
# Create Cloud SQL instance
gcloud sql instances create apmc-database \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=asia-south1 \
    --storage-auto-increase

# Create database
gcloud sql databases create apmc_trading --instance=apmc-database

# Create user and store password
DB_PASSWORD=$(openssl rand -base64 32)
gcloud sql users create apmc_user \
    --instance=apmc-database \
    --password=$DB_PASSWORD

# Store secrets
echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=-
echo -n "postgresql://apmc_user:$DB_PASSWORD@/cloudsql/$PROJECT_ID:asia-south1:apmc-database/apmc_trading" | gcloud secrets create database-url --data-file=-

SESSION_SECRET=$(openssl rand -base64 64)
echo -n "$SESSION_SECRET" | gcloud secrets create session-secret --data-file=-
```

#### Step 3: Deploy Application
```bash
# Build and deploy using Cloud Build
gcloud builds submit --config=cloudbuild.yaml

# Or deploy directly to Cloud Run
./deploy-scripts/cloud-run-deploy.sh
```

## Deployment Options

### Cloud Run (Recommended)
- **Auto-scaling**: 0 to 100 instances
- **Pay-per-use**: Only pay for actual traffic
- **Managed**: No server management required
- **Global**: Available worldwide

### App Engine (Alternative)
```bash
# Deploy to App Engine
gcloud app deploy app.yaml
```

## Post-Deployment Configuration

### 1. Database Migration
```bash
# Connect to Cloud SQL and run migrations
gcloud sql connect apmc-database --user=apmc_user

# Run your database setup scripts
# The application will auto-create tables on first run
```

### 2. Initial Data Setup
```bash
# Create super admin user (run once)
# Access the application and use the tenant onboarding system
# Default super admin: username=superadmin, password=password
```

### 3. Custom Domain (Optional)
```bash
# Map custom domain
gcloud run domain-mappings create \
    --service=apmc-trading-app \
    --domain=yourdomain.com \
    --region=asia-south1
```

## Monitoring and Maintenance

### View Logs
```bash
# Real-time logs
gcloud logs tail --service=apmc-trading-app

# Historical logs
gcloud logging read "resource.type=cloud_run_revision" --limit=100
```

### Update Application
```bash
# Make changes to code
# Redeploy
gcloud builds submit --config=cloudbuild.yaml
```

### Scale Resources
```bash
# Update Cloud Run service
gcloud run services update apmc-trading-app \
    --memory=4Gi \
    --cpu=4 \
    --max-instances=200 \
    --region=asia-south1
```

### Backup Database
```bash
# Create backup
gcloud sql backups create \
    --instance=apmc-database \
    --description="Manual backup $(date)"
```

## Cost Optimization

### Development Environment
- **Cloud Run**: Free tier covers 2M requests/month
- **Cloud SQL**: db-f1-micro ~$7/month
- **Storage**: $0.02/GB/month

### Production Environment
- **Cloud Run**: ~$24/month for 1M requests
- **Cloud SQL**: db-n1-standard-1 ~$45/month
- **Storage**: Based on actual usage

### Cost Monitoring
```bash
# Set up billing alerts
gcloud billing budgets create \
    --billing-account=BILLING_ACCOUNT_ID \
    --display-name="APMC Trading Budget" \
    --budget-amount=100USD
```

## Security Best Practices

### Network Security
- Cloud Run uses HTTPS by default
- Database connections are encrypted
- VPC connector for private networking

### Data Protection
- Secrets stored in Secret Manager
- Regular automated backups
- Multi-region availability

### Access Control
- IAM roles for service accounts
- Application-level authentication
- Tenant data isolation

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check Cloud SQL instance
gcloud sql instances describe apmc-database

# Verify secrets
gcloud secrets versions access latest --secret=database-url
```

#### 2. Application Won't Start
```bash
# Check build logs
gcloud builds log --stream

# Check runtime logs
gcloud logs read "resource.type=cloud_run_revision AND textPayload=ERROR"
```

#### 3. File Upload Issues
```bash
# Check storage bucket permissions
gsutil ls -L gs://your-bucket-name
```

### Performance Optimization

#### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_lots_tenant_status ON lots(tenant_id, status);
CREATE INDEX idx_bags_lot_id ON bags(lot_id);
CREATE INDEX idx_buyers_tenant_id ON buyers(tenant_id);
```

#### Application Optimization
- Enable gzip compression
- Use Cloud CDN for static assets
- Optimize database queries
- Implement caching where appropriate

## Support and Documentation

### Google Cloud Resources
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)

### Application Features
- Multi-tenant architecture supports 1000+ organizations
- Voice input in English, Hindi, Kannada
- OCR for invoice processing
- Comprehensive billing and reporting
- Mobile-optimized interface
- Offline capability with auto-sync