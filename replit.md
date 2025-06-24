# Overview

This is a multi-tenant APMC (Agricultural Produce Market Committee) management system built with a modern full-stack architecture. The application provides comprehensive management of farmers, lots, bags, and buyers in agricultural market scenarios with support for multiple tenants (APMC centers).

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and dark mode support
- **Forms**: React Hook Form with Zod validation
- **Internationalization**: Custom i18n implementation supporting English, Hindi, and Kannada

## Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and bcrypt password hashing
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints with role-based access control

## Data Storage
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations
- **Multi-tenancy**: Tenant-based data isolation with schema separation

# Key Components

## Multi-Tenant System
- Tenants represent different APMC centers with unique codes
- Each tenant has subscription plans (basic, gold, diamond) with user limits
- Tenant-specific settings for GST rates and operational parameters
- Data isolation ensures each tenant only accesses their own data

## User Management
- Role-based access control (super_admin, admin, staff)
- Tenant-scoped user authentication
- Secure session management with PostgreSQL store

## Core Business Entities
- **Farmers**: Complete farmer profiles with banking details
- **Lots**: Agricultural produce lots with pricing and logistics
- **Bags**: Individual bag tracking within lots with weight and grade
- **Buyers**: Customer management for purchase transactions

## Voice Recognition
- Browser-based speech recognition for hands-free data entry
- Multi-language support (English, Hindi, Kannada)
- Type-specific processing for numbers, currency, and text

## PDF Generation
- APMC format receipt generation
- Bag entry reports with summary statistics
- Print-optimized layouts for official documentation

# Data Flow

1. **Authentication Flow**: Users log in with tenant-scoped credentials
2. **Data Entry Flow**: Voice or manual input → form validation → database storage
3. **Reporting Flow**: Database queries → PDF generation → print/download
4. **Multi-tenant Flow**: All operations filtered by tenant context

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **passport**: Authentication middleware
- **bcrypt**: Password hashing
- **zod**: Runtime type validation

## Development Dependencies
- **Vite**: Build tool and development server
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Utility-first styling
- **React Hook Form**: Form state management

# Deployment Strategy

## Development
- Replit-optimized configuration with auto-restart
- Hot module replacement for fast development
- PostgreSQL module integration

## Production Build
- Vite builds optimized client bundle to `dist/public`
- ESBuild compiles server code to `dist/index.js`
- Static file serving for production deployment

## Environment Configuration
- Database URL configuration for Neon PostgreSQL
- Session secrets for secure authentication
- Multi-environment support (development/production)

# Changelog

- June 24, 2025. Initial setup

# User Preferences

Preferred communication style: Simple, everyday language.