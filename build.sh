#!/bin/bash
set -e

echo "Starting build process..."

# Install all dependencies including dev dependencies
echo "Installing dependencies..."
npm ci --include=dev

# Ensure build tools are available
echo "Installing build tools..."
npm install vite@latest esbuild@latest --no-save

# Build frontend
echo "Building frontend..."
npx vite build

# Build backend  
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Build completed successfully!"