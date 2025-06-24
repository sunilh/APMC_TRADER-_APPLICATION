# replit.md

## Overview

This is a full-stack APMC (Agricultural Produce Market Committee) management system built with React, Express.js, and PostgreSQL. The application supports multi-tenancy, allowing multiple APMC centers to manage their operations independently. It features farmer registration, lot management, bag entry with voice input capabilities, buyer management, and administrative functions.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Custom components built with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Forms**: React Hook Form with Zod validation
- **Voice Input**: Custom Web Speech API integration for hands-free data entry

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Password Hashing**: bcrypt for secure password storage
- **Request Logging**: Custom middleware for API request/response logging

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Neon serverless driver with WebSocket support

## Key Components

### Simplified Architecture (Post-Rollback)
- Single shared database tables without tenant isolation
- Simple role-based access control (admin, staff)
- Unified user management across the system
- Streamlined data model for faster development

### Authentication & Authorization
- Role-based access control (super_admin, admin, staff)
- Session-based authentication with secure cookies
- Protected routes on both client and server sides
- Super admin setup for initial system configuration

### Voice Recognition Integration
- Web Speech API wrapper for hands-free data entry
- Support for multiple languages (English, Hindi, Kannada)
- Number and currency processing for agricultural data
- Real-time transcription with confidence scoring

### Audit Trail System
- Comprehensive logging of all CRUD operations
- User action tracking with IP and user agent
- Before/after data snapshots for changes
- Tenant-scoped audit logs

## Data Flow

1. **User Authentication**: Login credentials validated against user table with tenant association
2. **Route Protection**: Client-side route guards check authentication status
3. **API Requests**: All API calls include tenant context for data isolation
4. **Database Operations**: Drizzle ORM handles type-safe queries with tenant filtering
5. **Real-time Updates**: TanStack Query manages cache invalidation and refetching
6. **Audit Logging**: All mutations trigger audit log creation with change tracking

## External Dependencies

### Database & Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL hosting
- **WebSocket**: For Neon database connections

### UI & Styling
- **Radix UI**: Headless component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Build tool with HMR and optimizations
- **Replit Integration**: Development environment plugins
- **PostCSS**: CSS processing with Autoprefixer

## Deployment Strategy

### Development Environment
- Hot module replacement via Vite dev server
- PostgreSQL module provisioned in Replit
- Environment variables for database connection
- Session store configured for development

### Production Build
- Vite builds optimized client bundle to `dist/public`
- esbuild compiles server code to `dist/index.js`
- Static file serving for production assets
- Autoscale deployment target on Replit

### Environment Configuration
- Development: `npm run dev` with tsx for TypeScript execution
- Production: `npm run build && npm run start`
- Database migrations: `npm run db:push` via Drizzle Kit

## Recent Changes
- June 24, 2025: Successfully rolled back from complex multi-tenant schema to simplified shared tables approach
- June 24, 2025: Restored original Vite integration for proper frontend development
- June 24, 2025: Fixed Express server startup with proper event handling for workflow system
- June 24, 2025: Added root route for Replit health check and proper PORT environment variable handling
- June 24, 2025: Removed tenant isolation complexity that was causing startup failures
- June 24, 2025: Application now successfully serves login page and API endpoints

## Changelog
```
Changelog:
- June 24, 2025: Initial setup and rollback to simplified architecture
- June 24, 2025: Fixed workflow integration and login functionality
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```