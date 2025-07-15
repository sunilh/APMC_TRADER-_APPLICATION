#!/bin/bash

# Google Cloud Platform Setup Script for APMC Trading Application
# Run this script to set up all GCP resources

set -e

# Configuration variables
PROJECT_ID=${1:-"apmc-trading-system"}
REGION="asia-south1"
ZONE="asia-south1-a"
DB_INSTANCE_NAME="apmc-database"
DB_NAME="apmc_trading"
DB_USER="apmc_user"
SERVICE_NAME="apmc-trading-app"

echo "🚀 Setting up APMC Trading Application on Google Cloud Platform"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK is not installed. Please install it first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "📋 Setting up project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    storage.googleapis.com \
    containerregistry.googleapis.com \
    appengine.googleapis.com \
    secretmanager.googleapis.com

# Create Cloud SQL instance
echo "🗄️ Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create $DB_INSTANCE_NAME \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=20GB \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --enable-bin-log \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=04 \
    --deletion-protection

# Create database
echo "📊 Creating database..."
gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE_NAME

# Create database user
echo "👤 Creating database user..."
DB_PASSWORD=$(openssl rand -base64 32)
gcloud sql users create $DB_USER \
    --instance=$DB_INSTANCE_NAME \
    --password=$DB_PASSWORD

# Store database password in Secret Manager
echo "🔐 Storing database credentials in Secret Manager..."
echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=-
echo -n "postgresql://$DB_USER:$DB_PASSWORD@/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE_NAME/$DB_NAME" | gcloud secrets create database-url --data-file=-

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 64)
echo -n "$SESSION_SECRET" | gcloud secrets create session-secret --data-file=-

# Create storage bucket for file uploads
echo "🪣 Creating storage bucket..."
BUCKET_NAME="$PROJECT_ID-apmc-uploads"
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_NAME/

# Set bucket permissions
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# Create VPC connector for Cloud SQL private IP (optional)
echo "🌐 Creating VPC connector..."
gcloud compute networks vpc-access connectors create apmc-connector \
    --region=$REGION \
    --subnet-project=$PROJECT_ID \
    --range=10.8.0.0/28

# Build and deploy the application
echo "🏗️ Building and deploying application..."
gcloud builds submit --config=cloudbuild.yaml

echo "✅ Setup completed successfully!"
echo ""
echo "📝 Important Information:"
echo "  Database Instance: $DB_INSTANCE_NAME"
echo "  Database Name: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  Storage Bucket: gs://$BUCKET_NAME"
echo "  Region: $REGION"
echo ""
echo "🔗 Access your application:"
echo "  Cloud Run: https://console.cloud.google.com/run"
echo "  Cloud SQL: https://console.cloud.google.com/sql"
echo "  Storage: https://console.cloud.google.com/storage"
echo ""
echo "🔑 Database connection details are stored in Secret Manager:"
echo "  Database URL: database-url"
echo "  Session Secret: session-secret"
echo ""
echo "⚠️  Make sure to update your application's environment variables with the secrets!"