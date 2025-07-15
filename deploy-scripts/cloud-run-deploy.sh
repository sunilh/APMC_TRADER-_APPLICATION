#!/bin/bash

# Cloud Run Deployment Script for APMC Trading Application
# This script handles the deployment to Google Cloud Run

set -e

PROJECT_ID=${1:-"apmc-trading-system"}
REGION="asia-south1"
SERVICE_NAME="apmc-trading-app"
IMAGE_NAME="gcr.io/$PROJECT_ID/apmc-trading"

echo "🚀 Deploying APMC Trading Application to Cloud Run"
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"

# Build the Docker image
echo "🏗️ Building Docker image..."
docker build -t $IMAGE_NAME:latest .

# Tag with commit SHA if available
if [ ! -z "$COMMIT_SHA" ]; then
    docker tag $IMAGE_NAME:latest $IMAGE_NAME:$COMMIT_SHA
fi

# Push to Container Registry
echo "📤 Pushing to Container Registry..."
docker push $IMAGE_NAME:latest

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 5000 \
    --memory 2Gi \
    --cpu 2 \
    --max-instances 100 \
    --min-instances 1 \
    --concurrency 80 \
    --timeout 300 \
    --set-env-vars NODE_ENV=production \
    --set-cloudsql-instances $PROJECT_ID:$REGION:apmc-database \
    --set-secrets DATABASE_URL=database-url:latest,SESSION_SECRET=session-secret:latest

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

echo "✅ Deployment completed successfully!"
echo ""
echo "🔗 Your application is available at: $SERVICE_URL"
echo ""
echo "📊 Monitor your application:"
echo "  Logs: gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --limit 50"
echo "  Metrics: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics"
echo ""
echo "🔧 Useful commands:"
echo "  Update service: gcloud run services update $SERVICE_NAME --region=$REGION"
echo "  View logs: gcloud logs tail --service=$SERVICE_NAME"
echo "  Delete service: gcloud run services delete $SERVICE_NAME --region=$REGION"