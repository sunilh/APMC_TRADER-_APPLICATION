#!/bin/bash

# Build script for deployment
echo "Building APMC Agricultural Trading Application..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Database setup
echo "Setting up database..."
if [ "$NODE_ENV" = "production" ]; then
    echo "Running database migrations..."
    npm run db:push
fi

echo "Build completed successfully!"