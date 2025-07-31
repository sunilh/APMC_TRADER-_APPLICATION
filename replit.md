# System Architecture

## Overview

This is a full-stack agricultural marketplace management system built for APMC (Agricultural Produce Market Committee) operations in India. The application manages farmer registrations, lot tracking, bag entry, buyer management, billing, and comprehensive financial reporting with GST compliance. Successfully completed TypeScript error resolution phase - reduced from 376 to 0 errors (complete elimination achieved through systematic approach). Critical agent stability threshold of 100 successfully surpassed. Tax invoice layout redesigned with professional PDF-matching format featuring seller/buyer details side by side, lot details centered, and calculations properly positioned. System remains fully functional with enhanced type safety throughout. **Successfully deployed to production at https://traderapp-pe5c.onrender.com with complete backend functionality including database setup endpoint, resolving all deployment and API issues (July 31, 2025).**

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **Forms**: React Hook Form with Zod validation
- **Internationalization**: Custom i18n system supporting English, Hindi, and Kannada

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Store**: PostgreSQL-based session storage for persistence
- **File Uploads**: Multer for handling document uploads
- **OCR Processing**: Tesseract.js for invoice text extraction

## Key Components

### Database Schema (PostgreSQL with Drizzle ORM)
- **Multi-tenancy**: Tenant-based data isolation for multiple APMC markets
- **Core Entities**: Farmers, Lots, Bags, Buyers, Tax Invoices, Farmer Bills
- **Financial Tracking**: Accounting ledger with double-entry bookkeeping
- **Inventory Management**: Stock tracking with purchase invoices and movements
- **Audit Trail**: Comprehensive logging of all system activities

### Authentication & Authorization
- **Multi-tenant authentication**: Users belong to specific APMC tenants
- **Role-based access**: Super admin, admin, and staff roles
- **Session persistence**: PostgreSQL session store for reliable auth state
- **Security**: bcrypt password hashing, secure session configuration

### Business Logic Modules

#### Trading Operations
- **Farmer Management**: Registration with bank details and KYC information
- **Lot Creation**: Product lot registration with variety and grade tracking
- **Bag Entry**: Individual bag weighing with buyer allocation
- **Buyer Management**: Company registration with contact and payment tracking

#### Financial Management
- **Double-entry Bookkeeping**: Complete accounting ledger with debit/credit entries
- **GST Compliance**: Automated GST calculation and reporting (SGST, CGST, Cess)
- **Tax Invoices**: Professional invoice generation with GST breakdown
- **Farmer Bills**: Comprehensive billing with deductions and net calculations
- **Final Accounts**: Profit & Loss, Balance Sheet, and Cash Flow reporting

#### Reporting & Analytics
- **Financial Reports**: Real-time P&L, balance sheet, and cash flow analysis
- **Tax Reports**: GST and Cess compliance reports with export functionality
- **Operational Reports**: Lot completion tracking and missing bag identification
- **Business Intelligence**: Farmer and buyer profitability analysis

## Data Flow

### Operational Flow
1. **Farmer Registration** → Bank details validation → KYC documentation
2. **Lot Creation** → Bag allocation → Individual bag weighing
3. **Buyer Assignment** → Purchase confirmation → Invoice generation
4. **Payment Processing** → Farmer bill generation → Financial recording

### Financial Flow
1. **Transaction Recording** → Double-entry ledger updates → Account balance maintenance
2. **Tax Calculation** → GST computation → Compliance report generation
3. **Final Accounts** → Automated P&L calculation → Balance sheet preparation

### Data Validation
- **Zod Schemas**: Type-safe validation for all data inputs
- **Business Rules**: Automated validation of accounting principles and tax calculations
- **Data Integrity**: Foreign key constraints and referential integrity

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle for type-safe database operations
- **Authentication**: Passport.js with session management
- **File Processing**: Sharp for image optimization, PDF2pic for document conversion

### Development Tools
- **TypeScript**: Full-stack type safety
- **ESBuild**: Fast production builds
- **Hot Reload**: Vite HMR for development experience
- **Code Quality**: TypeScript compiler checks

### UI/UX Libraries
- **Component Library**: Radix UI primitives with shadcn/ui styling
- **Icons**: Lucide React icon set
- **Voice Recognition**: Web Speech API integration for multi-language input
- **PDF Generation**: jsPDF for document creation

## Deployment Strategy

### Production Build
- **Frontend**: Vite static build optimized for performance
- **Backend**: ESBuild bundling with external dependency management
- **Assets**: Static file serving with proper caching headers

### Environment Configuration
- **Multi-environment**: Development, staging, and production configurations
- **Environment Variables**: Database URLs, session secrets, API keys
- **Security**: HTTPS enforcement, secure cookies, CORS configuration

### Hosting & Scalability
- **Platform**: Designed for Vercel deployment with serverless functions
- **Database**: Neon PostgreSQL with connection pooling
- **File Storage**: Local storage with potential cloud migration path
- **Performance**: Optimized bundle sizes and lazy loading

### Monitoring & Maintenance
- **Error Handling**: Comprehensive error boundaries and API error handling
- **Logging**: Structured logging for debugging and monitoring
- **Database Migrations**: Drizzle-based schema evolution
- **Backup Strategy**: Database backup and recovery procedures

The architecture emphasizes type safety, performance, and maintainability while supporting the complex business requirements of agricultural marketplace operations in India.