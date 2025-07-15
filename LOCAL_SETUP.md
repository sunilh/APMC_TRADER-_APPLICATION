# Local Machine Setup Guide - APMC Trading Application

## Prerequisites

### Required Software
1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

2. **PostgreSQL** (v14 or higher)
   - **Windows**: Download from https://www.postgresql.org/download/windows/
   - **macOS**: `brew install postgresql` or download from website
   - **Linux**: `sudo apt-get install postgresql postgresql-contrib`

3. **Git** (for cloning the repository)
   - Download from: https://git-scm.com/

### Optional but Recommended
- **pgAdmin** - PostgreSQL administration tool
- **VS Code** - For code editing
- **Postman** - For API testing

## Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if from Git)
git clone <repository-url>
cd apmc-trading-application

# Or if you have the project files locally
cd /path/to/your/project

# Install dependencies
npm install
```

### 2. PostgreSQL Database Setup

#### Start PostgreSQL Service
```bash
# macOS (if installed via Homebrew)
brew services start postgresql

# Windows - PostgreSQL should start automatically
# Linux
sudo systemctl start postgresql
```

#### Create Database and User
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Or on Windows/macOS
psql -U postgres
```

```sql
-- Create database
CREATE DATABASE apmc_trading;

-- Create user
CREATE USER apmc_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE apmc_trading TO apmc_user;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO apmc_user;

-- Exit
\q
```

### 3. Environment Configuration

Create a `.env` file in your project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your local settings:
```env
# Database Configuration
DATABASE_URL=postgresql://apmc_user:your_secure_password@localhost:5432/apmc_trading
PGHOST=localhost
PGDATABASE=apmc_trading
PGUSER=apmc_user
PGPASSWORD=your_secure_password
PGPORT=5432

# Application Configuration
NODE_ENV=development
PORT=5000

# Session Configuration
SESSION_SECRET=your_long_random_session_secret_minimum_64_characters_for_security

# Optional: File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### 4. Database Schema Setup

```bash
# Push database schema (creates all tables)
npm run db:push

# Or if you need to generate migrations first
npm run db:generate
npm run db:migrate
```

### 5. Create Uploads Directory

```bash
# Create required directories
mkdir -p uploads/invoices
mkdir -p uploads/processed

# On Windows (if mkdir doesn't work)
# Create these folders manually in your project root
```

### 6. Start the Application

```bash
# Development mode (with hot reload)
npm run dev

# The application will start on:
# Frontend: http://localhost:5000
# Backend API: http://localhost:5000/api
```

## Initial Application Setup

### 1. Create Super Admin Account

When you first access the application:

1. Navigate to: http://localhost:5000
2. The default super admin credentials are:
   - **Username**: `superadmin`
   - **Password**: `password`

### 2. Create Your First Tenant (APMC Organization)

1. Login as super admin
2. Go to "Create Tenant" section
3. Fill in your APMC details:
   - Organization name
   - APMC code
   - Address and contact details
   - GST, PAN, FSSAI numbers
   - Bank details

### 3. Create Admin User for Your Tenant

1. After creating tenant, create an admin user
2. Logout from super admin
3. Login with your new admin credentials

### 4. Configure Settings

1. Go to Settings page
2. Configure GST rates (SGST, CGST, CESS)
3. Set up charges (unload hamali, packaging, weighing fees)
4. Configure APMC commission percentage

## Development Workflow

### Running the Application

```bash
# Start development server
npm run dev

# Build for production (optional)
npm run build

# Start production build
npm start
```

### Database Operations

```bash
# Reset database (careful - deletes all data)
npm run db:reset

# Generate new migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Check database status
npm run db:studio
```

### Useful Development Commands

```bash
# Check application health
curl http://localhost:5000/health

# View database with Drizzle Studio
npm run db:studio

# Check logs in development
# Logs appear in your terminal where you ran npm run dev
```

## Testing the Application

### 1. Test Basic Functionality

1. **Authentication**: Login/logout works
2. **Farmers**: Create and manage farmer records
3. **Lots**: Create lots and add bag entries
4. **Buyers**: Manage buyer information
5. **Billing**: Generate farmer bills and tax invoices

### 2. Test Voice Input

1. Click any voice input button (microphone icon)
2. Allow microphone permissions in your browser
3. Speak numbers, text, or amounts
4. Test in English, Hindi, or Kannada

### 3. Test OCR Functionality

1. Go to "Buyer/Trader" → "Invoice Management"
2. Upload a test invoice image
3. Verify OCR text extraction works

### 4. Test PDF Generation

1. Create some test data (farmers, lots, buyers)
2. Generate farmer bills
3. Generate tax invoices
4. Verify PDF downloads work

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -U apmc_user -d apmc_trading -c "\dt"

# Reset connection
npm run db:push
```

### Port Already in Use

```bash
# Kill process using port 5000
# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### Node Modules Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or use npm ci for faster install
npm ci
```

### File Upload Issues

```bash
# Check uploads directory permissions
ls -la uploads/

# Fix permissions (macOS/Linux)
chmod 755 uploads/
chmod 755 uploads/invoices/
chmod 755 uploads/processed/
```

## Performance Optimization

### For Development

1. **Use SSD**: Store project on SSD for faster file operations
2. **Increase Node Memory**: `export NODE_OPTIONS="--max-old-space-size=4096"`
3. **Use Fast WiFi**: Voice input and API calls work better with good internet

### Database Optimization

```sql
-- Add indexes for better performance (run in psql)
CREATE INDEX CONCURRENTLY idx_lots_tenant_status ON lots(tenant_id, status);
CREATE INDEX CONCURRENTLY idx_bags_lot_id ON bags(lot_id);
CREATE INDEX CONCURRENTLY idx_buyers_tenant_id ON buyers(tenant_id);
```

## Development Tips

### 1. Hot Reload

- Code changes automatically restart the server
- Frontend changes appear immediately
- Database schema changes require `npm run db:push`

### 2. Debugging

```bash
# Enable debug logs
DEBUG=* npm run dev

# Debug specific modules
DEBUG=express:* npm run dev
```

### 3. API Testing

Test endpoints using curl or Postman:

```bash
# Health check
curl http://localhost:5000/health

# Get user info (after login)
curl http://localhost:5000/api/user

# List farmers
curl http://localhost:5000/api/farmers
```

## Production-Like Local Setup

To test production features locally:

```bash
# Build production version
npm run build

# Set production environment
export NODE_ENV=production

# Start production server
node dist/index.js
```

## Backup and Data Management

### Backup Database

```bash
# Create backup
pg_dump -U apmc_user -h localhost apmc_trading > backup.sql

# Restore backup
psql -U apmc_user -h localhost apmc_trading < backup.sql
```

### Export Data

The application includes CSV export functionality for:
- Tax reports
- CESS reports
- GST reports
- Farmer bills
- Purchase history

This local setup gives you full development and testing capabilities on your own machine!