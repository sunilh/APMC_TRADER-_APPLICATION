# Environment Setup for Google Cloud Deployment

## Required Environment Variables

### Database Configuration
```bash
# Primary database connection
DATABASE_URL=postgresql://username:password@/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME/DATABASE_NAME

# Individual database components (auto-set by Cloud SQL)
PGHOST=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
PGDATABASE=apmc_trading
PGUSER=apmc_user
PGPASSWORD=your_secure_password
PGPORT=5432
```

### Authentication & Security
```bash
# Session management (store in Secret Manager)
SESSION_SECRET=your_long_random_session_secret_64_chars_minimum

# Node.js environment
NODE_ENV=production
PORT=5000
```

### Google Cloud Specific
```bash
# Google Cloud project and region
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=asia-south1

# For file uploads (optional)
GOOGLE_CLOUD_STORAGE_BUCKET=your-project-id-apmc-uploads
```

## Setting up Secrets in Google Cloud

### 1. Database Password
```bash
# Generate and store database password
DB_PASSWORD=$(openssl rand -base64 32)
echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=-
```

### 2. Database URL
```bash
# Complete database URL for the application
DATABASE_URL="postgresql://apmc_user:$DB_PASSWORD@/cloudsql/PROJECT_ID:asia-south1:apmc-database/apmc_trading"
echo -n "$DATABASE_URL" | gcloud secrets create database-url --data-file=-
```

### 3. Session Secret
```bash
# Generate and store session secret
SESSION_SECRET=$(openssl rand -base64 64)
echo -n "$SESSION_SECRET" | gcloud secrets create session-secret --data-file=-
```

## Cloud Run Service Configuration

### Memory and CPU Settings
- **Memory**: 2Gi (handles file uploads and OCR processing)
- **CPU**: 2 vCPU (supports concurrent requests)
- **Max Instances**: 100 (auto-scales based on traffic)
- **Min Instances**: 1 (always-on for agricultural operations)
- **Concurrency**: 80 requests per instance

### Database Connection
- Uses Cloud SQL proxy for secure connections
- Automatic SSL/TLS encryption
- Private IP connectivity via VPC connector

## File Storage Configuration

### Upload Handling
- **Local Development**: `uploads/` directory
- **Production**: Google Cloud Storage bucket
- **Max File Size**: 10MB for invoice images
- **Supported Formats**: PNG, JPG, PDF

### OCR Processing
- **Engine**: Tesseract.js (client-side processing)
- **Alternative**: Google Cloud Vision API (enhanced accuracy)
- **Languages**: English, Hindi, Kannada

## Monitoring and Logging

### Health Checks
- **Path**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 3 seconds

### Logging
```bash
# View application logs
gcloud logs tail --service=apmc-trading-app

# View specific log entries
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=apmc-trading-app" --limit=50
```

### Metrics
- Request count and latency
- Memory and CPU usage
- Database connection health
- File upload success rates

## Production Deployment Checklist

### Before Deployment
- [ ] Set up Google Cloud Project
- [ ] Enable required APIs
- [ ] Create Cloud SQL instance
- [ ] Configure VPC connector
- [ ] Set up Secret Manager secrets
- [ ] Create storage bucket

### During Deployment
- [ ] Build Docker image
- [ ] Push to Container Registry
- [ ] Deploy to Cloud Run
- [ ] Configure environment variables
- [ ] Set up database connection

### After Deployment
- [ ] Test health endpoint
- [ ] Verify database connectivity
- [ ] Test file upload functionality
- [ ] Validate OCR processing
- [ ] Check multi-tenant isolation
- [ ] Test voice input features

## Scaling Considerations

### Database Scaling
- **Development**: db-f1-micro (1 vCPU, 0.6GB RAM)
- **Production**: db-n1-standard-2 (2 vCPU, 7.5GB RAM)
- **High Load**: db-n1-standard-4 (4 vCPU, 15GB RAM)

### Application Scaling
- **Auto-scaling**: Based on CPU and request throughput
- **Regional**: Deploy in multiple regions for global access
- **Load Balancing**: Automatic with Cloud Run

### Storage Scaling
- **Database**: Auto-increase enabled
- **File Storage**: Unlimited with Cloud Storage
- **Backup**: Automated daily backups