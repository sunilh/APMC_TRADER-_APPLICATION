#!/bin/bash

# Install all dependencies including dev dependencies
npm install --include=dev

# Build frontend with npx to ensure vite is available
npx vite build

# Build backend with npx to ensure esbuild is available  
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build completed successfully!"