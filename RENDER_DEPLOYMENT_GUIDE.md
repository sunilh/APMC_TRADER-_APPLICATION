# Render Deployment Guide - Monorepo Setup

## Overview
This guide sets up separate frontend and backend deployments from a single monorepo on Render.

## 🚀 Backend Deployment

### 1. Create Backend Web Service
- **Service Name:** `traderapp-backend`
- **Build Command:** `cd .. && npm install && node render-monorepo-backend.js`
- **Start Command:** `cd dist && node server.js`
- **Publish Directory:** `dist`
- **Environment:** Node

### 2. Backend Environment Variables
```bash
NODE_ENV=production
DATABASE_URL=[Your PostgreSQL URL]
```

### 3. Backend Build Process
The `render-monorepo-backend.js` script:
- Auto-detects monorepo root directory
- Builds `server/minimal-backend.ts` with esbuild
- Creates production `package.json` with required dependencies
- Copies necessary files (eng.traineddata for OCR)
- Outputs bundled server to `dist/server.js`

---

## 🎨 Frontend Deployment

### 1. Create Frontend Static Site
- **Service Name:** `traderapp-frontend`
- **Build Command:** `cd .. && npm install && node render-monorepo-frontend.js`
- **Publish Directory:** `client/dist`
- **Environment:** Node

### 2. Frontend Environment Variables
```bash
NODE_ENV=production
VITE_API_BASE_URL=https://traderapp-backend.onrender.com
```

### 3. Frontend Build Process
The `render-monorepo-frontend.js` script:
- Auto-detects monorepo root directory
- Builds with Vite from root (proper path aliases)
- Handles both `dist/` and `dist/public/` output locations
- Copies files to `client/dist/` for Render

---

## 📁 File Structure
```
📁 Root/
├── render-monorepo-backend.js    ✅ Backend build script
├── render-monorepo-frontend.js   ✅ Frontend build script
├── package.json                  ✅ Monorepo dependencies
├── server/
│   └── minimal-backend.ts        ✅ Backend entry point
├── client/
│   └── src/                      ✅ Frontend source
└── dist/                         📦 Build outputs
```

---

## 🔧 Deployment Steps

### Step 1: Push Updated Scripts
```bash
git add render-monorepo-backend.js render-monorepo-frontend.js
git commit -m "Add monorepo deployment scripts for Render"
git push origin main
```

### Step 2: Configure Backend Service
1. Create new Web Service on Render
2. Connect to `sunilh/TRADERAPP` repository
3. Use Backend settings above

### Step 3: Configure Frontend Service
1. Create new Static Site on Render
2. Connect to same `sunilh/TRADERAPP` repository
3. Use Frontend settings above

### Step 4: Update Frontend API Configuration
Ensure frontend connects to backend:
```typescript
// client/src/lib/api-config.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://traderapp-backend.onrender.com';
```

---

## ✅ Verification

### Backend Health Check
```bash
curl https://traderapp-backend.onrender.com/
# Should return: {"message":"APMC Backend API","status":"running"}
```

### Frontend Verification
- Visit: `https://traderapp-frontend.onrender.com`
- Should load React application
- Check browser console for API connectivity

---

## 🛠️ Troubleshooting

### Common Issues:
1. **Build fails with "package.json not found"**
   - Solution: Scripts auto-detect root directory

2. **Frontend API calls fail**
   - Check `VITE_API_BASE_URL` environment variable
   - Verify backend is deployed and running

3. **Backend dependencies missing**
   - Scripts create production `package.json` with required deps
   - Render installs automatically

### Debug Commands:
```bash
# Test backend build locally
node render-monorepo-backend.js

# Test frontend build locally
node render-monorepo-frontend.js

# Check build outputs
ls -la dist/
ls -la client/dist/
```

---

## 📊 Expected Results

**Backend URL:** `https://traderapp-backend.onrender.com`
**Frontend URL:** `https://traderapp-frontend.onrender.com`

Both services will auto-deploy on every push to main branch.