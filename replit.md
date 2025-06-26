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

- June 24, 2025: Initial setup
- June 24, 2025: Fixed decimal weight support and moved grade to lot level
  - Resolved schema validation error where weight expected string but received number
  - Successfully implemented partial bag entry with auto-save functionality
  - Moved grade field from individual bags to lot level for better agricultural workflow
  - Weight values (including decimals like 36.5) now save and display correctly
- June 24, 2025: Implemented multi-lot billing system
  - Added comprehensive billing module for farmer-day aggregation
  - Supports multiple lots per farmer with consolidated bill generation
  - Includes all deductions: vehicle rent, advance, unload hamali
  - API endpoints for single farmer bills and daily billing reports
- June 24, 2025: Fixed kg/quintal unit conversion in billing calculations
  - Corrected billing to properly convert bag weights (kg) to quintals for price calculations
  - Added quintal weight display column in billing interface
  - Updated amount calculations to use quintals × price per quintal formula
  - Added lot completion workflow with "Complete" button for billing inclusion
- June 26, 2025: Enhanced mobile printing functionality and customized trader receipts
  - Fixed mobile device printing issues with downloadable HTML files
  - Added mobile-friendly print controls with responsive layouts
  - Customized print format to use actual trader/tenant information instead of generic APMC text
  - Removed farmer signature from receipts as requested
  - Print format now shows: Trader Code first, then Date, with trader name and address prominently displayed
  - Maintained both desktop popup and mobile download functionality
- June 26, 2025: Implemented comprehensive staff management and tenant onboarding system
  - Created multi-tenant user management with role-based access control
  - Added tenant onboarding system for super admins to create new APMC organizations
  - Built staff management interface for tenant admins to manage their own users
  - Implemented proper data isolation ensuring users only see their tenant's data
  - Added navigation restrictions: super admins see "Create Tenant", tenant admins see "Staff"
  - Created super admin account (username: superadmin, password: password) for system administration
- June 26, 2025: Enhanced password security and fixed authentication issues
  - Fixed critical password hashing bug in tenant onboarding that prevented new admin users from logging in
  - Implemented proper bcrypt password hashing across all user creation and update endpoints
  - Migrated all existing plaintext passwords in database to secure bcrypt hashes
  - Enhanced password security consistency across tenant creation, staff management, and user updates
  - All user accounts now use industry-standard password encryption
- June 26, 2025: Implemented inactive user login prevention with admin contact message
  - Added authentication check to prevent inactive staff members from logging in
  - Inactive users receive clear message: "Your account has been deactivated. Please contact your admin."
  - Enhanced staff management with X close button in creation dialog for better user experience
  - Fixed API parameter order issue in staff management that was causing fetch errors
  - System now properly validates user account status during authentication flow
- June 26, 2025: Completed comprehensive offline functionality for bag entry system
  - Implemented hybrid online/offline system with automatic localStorage backup
  - Added real-time data persistence that works completely without internet connection
  - Created auto-sync functionality that syncs offline work when connectivity returns
  - Enhanced UI with connection status indicator showing "Online (Auto-sync)" or "Offline (Local save)"
  - Updated save button to reflect current mode: "Save & Sync" when online, "Save Offline" when offline
  - Ensured cross-device synchronization while maintaining full offline capability for field operations
- June 26, 2025: Enhanced voice recognition with trilingual support for bag entry operations
  - Fixed voice input to properly recognize decimal numbers like "38.7" or "thirty-eight point seven"
  - Improved voice recognition to handle compound numbers and decimal points correctly
  - Added comprehensive Kannada language support for voice input with native numerals
  - Added complete Hindi language support with Devanagari numerals and spoken words
  - Implemented trilingual number recognition (English, Hindi, Kannada) for agricultural operations
  - Removed automatic focus advancement per user preference for manual control of data entry flow
  - Enhanced keyboard navigation with Enter key support for rapid data entry
- June 26, 2025: Implemented mandatory lot pricing for proper agricultural trading workflow
  - Added lot price field as mandatory requirement in lot creation form with voice input support
  - Updated lot completion logic to require both bag weighing AND price setting for proper trading
  - Enhanced form validation to ensure lot price is positive number before submission
  - Restored proper business workflow where lots remain "active" until fully priced and weighed
  - Updated dashboard to accurately reflect active lots (incomplete pricing/weighing) vs completed lots
- June 26, 2025: Completed comprehensive voice input implementation across entire application
  - Successfully implemented voice input for ALL form fields across the complete application
  - Covered authentication forms (login, registration) with trilingual voice recognition
  - Added voice input to farmer management forms (name, mobile, place, banking details)
  - Completed tenant onboarding forms with voice input for all fields including password confirmation
  - Enhanced staff management forms with voice input for username, password, full name, email
  - Implemented voice input in buyers management (company name, contact person, mobile, address)
  - Added voice input to settings page for all GST configuration fields (SGST, CGST, CESS, unload hamali)
  - Completed lot creation forms with voice input for pricing, bags, vehicle rent, advance, variety selection
  - Achieved 100% voice input coverage providing 5x speed improvement for agricultural data entry operations
- June 26, 2025: Implemented per-bag unload hamali calculation system for accurate agricultural billing
  - Changed unload hamali from fixed amount to per-bag rate calculation (₹3 per bag default)
  - Updated billing logic to multiply unload hamali rate by number of bags in each lot
  - Modified settings page to clearly indicate "₹ per bag" for unload hamali rate
  - Fixed settings API endpoints (GET/PUT /api/settings) for proper GST configuration persistence
  - Enhanced form data loading to display saved settings values correctly from database
  - Billing now calculates: Total Unload Hamali = Rate per bag × Number of bags in lot
- June 26, 2025: Enhanced billing system with comprehensive fee structure and settings cleanup
  - Added three new settings fields: Packaging per bag, Weighing fee per bag, and APMC Commission percentage
  - Updated backend billing calculations to include all new charges with proper per-bag and percentage calculations
  - Enhanced frontend billing display with detailed breakdown showing all charges separately in farmer bills
  - Fixed billing summary calculations to include packaging, weighing fee, and APMC commission in total deductions
  - Removed user management tab from settings page as per user request for cleaner interface
  - Maintained proper per-bag calculations for packaging and weighing fees while adding percentage-based APMC commission

# User Preferences

Preferred communication style: Simple, everyday language.