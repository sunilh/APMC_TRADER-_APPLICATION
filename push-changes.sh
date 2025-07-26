#!/bin/bash

echo "Pushing recent changes to GitHub..."

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix Render deployment: Move Vite to production dependencies

- Resolved 'Cannot find package vite' error during Render deployment
- Moved Vite from devDependencies to production dependencies
- Enhanced farmer bill layout with horizontal farmer details display
- All functionality preserved, deployment-ready"

# Push to main branch
git push origin main

echo "Changes pushed successfully!"