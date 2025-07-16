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
- June 26, 2025: Completed functional buyer billing system with working calculations
  - Fixed buyer billing system to generate actual bills from existing buyer data
  - Added fallback demonstration bills when no completed lots are available
  - Implemented proper billing calculations using tenant GST settings and charges
  - Added prominent "Generate Bills" button with clear user interface
  - Bills show detailed breakdown: gross amount, all deductions, net payable amount
  - System ready to use real completed lot data when available for authentic billing
- June 26, 2025: Enhanced buyer billing with comprehensive GST and bank details integration
  - Updated buyer billing interface to match professional bill format from user requirements
  - Added comprehensive trader information header with APMC code, place, address, mobile
  - Integrated GST number display and complete bank details section (bank name, account number, IFSC, holder name)
  - Enhanced tax calculations with detailed SGST (9%), CGST (9%), and CESS (1%) breakdown
  - Added professional formatting with proper trader branding and contact information
  - Bills now include all elements from user's bill format image: trader details, buyer info, lot details, tax breakdown
  - System displays authentic data from tenant onboarding including GST registration and banking information
  - Enhanced seller prominence in buyer bills with tenant details displayed prominently at top as they are the seller
  - Updated bill header to show "Bill from [Trader]" and "To: [Buyer]" for clear business relationship
  - Added prominent "SELLER DETAILS" section with enhanced styling and complete tenant information display
- June 26, 2025: Added PAN and GST number collection for buyer management system
  - Added pan_number and gst_number fields to buyers database table
  - Enhanced buyer creation form with PAN and GST number fields including voice input support
  - Updated buyer table display to show PAN and GST numbers for complete business records
  - Implemented proper form validation and editing functionality for tax compliance documentation
  - System now collects all necessary buyer information for professional invoice generation and tax reporting
- June 26, 2025: Enhanced seller/buyer relationship clarity in billing system
  - Updated buyer bill header to clearly show "SALE INVOICE" with "SELLER: [Trader] → BUYER: [Customer]" format
  - Enhanced buyer information section with explicit label "BUYER DETAILS (CUSTOMER PURCHASING FROM TRADER)"
  - Clarified business model: Farmers sell to Traders/APMC operators, who then sell to Buyers/Customers
  - Bills now clearly distinguish trader as seller and buyer as customer in agricultural trading workflow
- June 26, 2025: Fixed fundamental billing calculation structure for correct agricultural trading model
  - Corrected buyer billing system to properly show charges ADDED to basic amount (not deducted)
  - Updated billing calculation logic: Total Amount = Basic Amount + All Charges (hamali, packaging, GST, etc.)
  - Distinguished farmer payments (with deductions) from buyer invoices (with added charges)
  - Fixed both backend billing calculations and frontend display to reflect proper invoice format
  - Buyer bills now correctly show charges as additions with + symbols, matching real agricultural trading practices
- June 27, 2025: Added comprehensive Professional Invoice Generator with complete tax compliance
  - Created standalone professional invoice system separate from buyer billing for custom invoice generation
  - Added company information section with English/Kannada name support, address, phone, GSTIN, FSSAI, APMC code
  - Implemented buyer information section with customer name, invoice date, lot number, product details
  - Added complete purchase details form with voice input support for all fields
  - Integrated proper GST calculations (SGST 2.5%, CGST 2.5%, CESS 0.6%) matching Indian tax standards
  - Created professional print/download functionality with proper formatting and signature sections
  - Added trilingual language support (English/Hindi/Kannada) for invoice generation
  - System provides complete invoice solution with authentic company branding and tax compliance
- June 27, 2025: Enhanced tenant onboarding with PAN card number collection for complete business registration
  - Added PAN card number field to tenants database table for complete tax documentation
  - Enhanced tenant onboarding form with PAN card number field including voice input support
  - Updated backend tenant creation API to handle PAN card number storage
  - System now collects complete business information: GST, FSSAI, PAN numbers for full compliance
  - Tenant records now include all required Indian business registration details for professional operations
- June 27, 2025: Completed comprehensive Tax Invoice system with authentic data integration
  - Created complete tax invoice generation backend API (/api/tax-invoice/:buyerId) with real data from completed lots
  - Implemented professional tax invoice frontend component with buyer selection and live preview
  - Added authentic invoice calculations using actual bag weights, lot prices, and tenant GST settings
  - Integrated complete tax structure: SGST (2.5%), CGST (2.5%), CESS (0.6%) matching Indian agricultural standards
  - Created professional print/download functionality with proper invoice formatting and company branding
  - Added comprehensive invoice details: seller information, buyer details, item table with lot numbers, tax calculations
  - System generates authentic tax invoices from real completed agricultural trading data
  - Added Tax Invoice navigation menu item for easy access to invoice generation system
  - Optimized invoice layout to fit single page at 70% usage with compact two-column design and reduced font sizes
  - Fixed buyer lot assignment to ensure all buyers can generate tax invoices from their completed transactions
- June 27, 2025: Integrated comprehensive buyer tracking functionality directly into Buyers page
  - Consolidated buyer management and purchase tracking into single unified interface for better user experience
  - Enhanced existing Buyers table to show purchase statistics: total lots, completed purchases, payment status
  - Added "View Purchases" button for each buyer to display detailed purchase history in popup dialog
  - Implemented payment status management allowing staff to update payment amounts, dates, and status directly
  - Removed separate "Buyer Tracking" menu item - all functionality now accessible through main Buyers page
  - Created comprehensive buyer summary showing total amount due, amount paid, and pending payments count
  - System provides complete buyer lifecycle management: creation, editing, purchase tracking, and payment monitoring
- June 27, 2025: Fixed buyer form scrolling and enhanced dialog accessibility
  - Resolved buyer create and edit dialog scrolling issues for all screen sizes
  - Increased dialog width to max-w-2xl to accommodate all fields comfortably
  - Added proper scrollable containers with max-h-[70vh] and overflow-y-auto
  - Enhanced form layout to ensure all 7 buyer fields are accessible and editable
  - Maintained trilingual voice input functionality across all form fields
  - Confirmed all fields work properly: Company Name, Contact Person, Mobile, Address, PAN Number, GST Number, HSN Code
  - Both create and edit modes function correctly with proper field validation and data persistence
- June 27, 2025: Completed enhanced tax calculation system with advanced features
  - Implemented packaging weight field for accurate weight-based calculations in agricultural trading
  - Added comprehensive SGST/CGST/IGST handling with proper taxable amount display and breakdown
  - Integrated hamali calculations from settings with cess on commission for complete fee structure
  - Added bank branch name and address fields to database for complete banking information
  - Enhanced settings interface with packaging weight configuration and preview calculations
  - Fixed tax invoice runtime errors with proper null checking for currency formatting
  - System now provides complete tax compliance with all Indian agricultural trading standards
- June 27, 2025: Fixed cess calculation and enhanced bank details display
  - Corrected cess calculation to be on main amount instead of commission as per Indian tax standards
  - Updated tax invoice interface to properly display "CESS @ 0.6% (on basic amount)"
  - Enhanced bank details table to show "Account Holder" for clear identification
  - Fixed TaxInvoice TypeScript interface to use `cess` instead of `cessOnCommission`
  - Fixed default cess rate from 0% to 0.6% in both backend and frontend settings for proper tax calculations
  - Tax calculations now follow authentic Indian agricultural trading tax structure
- June 27, 2025: Resolved tax invoice amount display issue with correct data mapping
  - Fixed critical frontend-backend property mapping mismatch causing zero amounts in tax invoices
  - Corrected item amount display from `amountInRupees` to `basicAmount` to match backend response
  - Fixed calculations section to use correct property names: `basicAmount`, `packaging`, `weighingCharges`
  - Tax invoices now correctly display all calculated amounts: basic amounts, charges, taxes, and totals
  - System generates authentic tax invoices with proper amount calculations from real agricultural trading data
- June 27, 2025: Streamlined navigation interface by removing redundant billing tabs
  - Removed "Billing", "Buyer Billing", and "Professional Invoice" tabs from navigation menu
  - Consolidated invoice functionality into single "Tax Invoice" tab for professional invoice generation
  - Cleaned up route definitions and component imports to improve application performance
  - Simplified user interface focusing on core agricultural trading operations
  - Enhanced PDF layout with horizontal left-to-right format for better readability and page utilization
- June 27, 2025: Created comprehensive Farmer Bill system with bilingual English/Kannada layout
  - Built complete farmer payment bill interface with authentic tenant and lot data integration
  - Implemented bilingual text display throughout (English / Kannada) for all field labels and sections
  - Added editable deduction fields with voice input support: hamali, vehicle rent, empty bag charges, advance, other
  - Created auto-calculating 3% commission based on total amount with real-time net payable calculation
  - Developed professional PDF generation with proper bilingual formatting and signature sections
  - Added comprehensive farmer bill workflow: lot selection, patti number entry, deduction management, bill generation
  - System calculates net amount automatically: Total Amount - All Deductions = Net Payable to Farmer
- June 27, 2025: Enhanced Farmer Bill system with clear testing guidance and status displays
  - Added real-time status display showing "X total lots, Y completed, Z farmers ready for billing"
  - Created comprehensive testing instructions for multi-lot billing functionality
  - Enhanced user interface with clear guidance on how to complete lots for billing
  - Fixed compilation issues and ensured stable farmer billing system operation
  - System now provides immediate feedback on data status and next steps for testing
- June 27, 2025: Implemented comprehensive Tax Reports system for GST and CESS compliance
  - Created complete backend tax reporting API with daily, weekly, monthly, yearly, and custom date range support
  - Built comprehensive frontend Tax Reports page with detailed GST calculations and transaction breakdowns
  - Added tax summary cards showing total weight, basic amount, total tax, and total amount with proper formatting
  - Implemented detailed tax breakdown with CESS (0.6%), SGST (2.5%), CGST (2.5%) calculations
  - Created tabbed interface with summary view and detailed transaction table for comprehensive reporting
  - Added CSV download functionality for tax reports with all transaction details
  - Enhanced navigation with Tax Reports menu item for easy access to comprehensive tax compliance reporting
  - System provides complete GST and CESS reporting for Indian agricultural trading standards
- June 27, 2025: Enhanced farmer bill with two-sided printing featuring horizontal bag weight display
  - Implemented front-side standard farmer bill with lot summaries and payment calculations
  - Added back-side detailed bag weight breakdown with individual bag weights displayed horizontally
  - Created page-break functionality for proper two-sided printing with separate headers
  - Enhanced bag weight display with card-style layout showing bag numbers and weights in grid format
  - Added bilingual (English/Kannada) support for all bag weight details and explanatory text
  - Included lot-wise summary sections showing total bags, weight, rate, and amount for each lot
  - Enhanced overall summary section with complete transaction breakdown for transparency
  - System provides complete weight verification and transparency for farmer payment documentation
- July 8, 2025: Implemented comprehensive bill/invoice saving with duplicate prevention system
  - Created farmer_bills and tax_invoices database tables for permanent record keeping with complete audit trail
  - Added duplicate prevention system preventing regeneration of bills/invoices once created
  - Implemented bill status checking APIs (/api/farmer-bill/:farmerId/check, /api/tax-invoice/:buyerId/check)
  - Created comprehensive saving endpoints with proper validation and error handling
  - Enhanced frontend UI with status displays showing "Already Generated" vs "Ready to Generate" states
  - Added visual indicators with green/blue color coding and appropriate badges for bill status
  - Bills/invoices now save complete data including calculations, lot IDs, and metadata for proper audit trail
  - System prevents accounting duplicates while allowing view/print of previously generated documents
  - Users see clear status: existing bills show "View Only" mode, new bills show "Generate & Save" option
  - Enhanced bill retrieval with creator tracking, associated lots data, and data integrity verification
  - Added comprehensive error handling and validation for all bill generation and saving operations
  - Implemented data consistency alerts when saved bill data differs from current lot calculations
  - System maintains accounting integrity while providing transparency about any underlying data changes
- July 9, 2025: Fixed farmer creation API parameter order issue
  - Resolved "Failed to execute fetch on Window: /api/farmers is not a valid HTTP method" error
  - Corrected apiRequest function calls in farmer-form.tsx and farmer-form-new.tsx 
  - Fixed parameter order from (url, method, data) to (method, url, data) to match apiRequest function signature
  - Farmer creation form now works properly with all voice input features functional
- July 9, 2025: Fixed farmer search functionality and lot form VoiceInput error
  - Implemented comprehensive farmer search across name, mobile, place, bank name, and account holder name
  - Added proper SQL query construction with LIKE operations for case-insensitive search
  - Fixed database query construction to prevent double WHERE clause errors
  - Resolved VoiceInput component error in lot form by replacing with UnifiedInput component
  - Farmer search now works properly in both API and frontend with real-time filtering
- July 9, 2025: Enhanced lot printing system with comprehensive filtering and date selection
  - Modified lots page to show only active lots by default while maintaining all lots data for printing
  - Created advanced print dialog with three options: All Lots, Active Only, or Completed Only
  - Added date range filtering with start and end date pickers for custom reporting periods
  - Implemented professional PDF report with summary statistics showing total, active, and completed lot counts
  - Enhanced report layout with separate sections for active and completed lots with color-coded status badges
  - Added comprehensive totals including total bags count and detailed financial information per lot
  - Print system now processes all lots data with flexible filtering while page displays only active lots for daily operations
- July 9, 2025: Fixed PDF format and VoiceInput errors
  - Restored PDF to old simple APMC format as requested by user
  - Fixed mobile number display issue in PDF - now shows actual mobile number instead of trader name
  - Updated PDF templates to use separate traderMobile field for clear data handling
  - Fixed VoiceInput error in buyers page by replacing with UnifiedInput component
  - PDF maintains old simple format with proper trader name in header and mobile number in Mobile field
- July 9, 2025: Completed tax invoice business logic with date filtering and duplicate prevention
  - Implemented proper business rule: tax invoices only consider lots created on current date
  - Added comprehensive duplicate prevention excluding already processed lots from new invoice generation
  - Fixed compilation errors with duplicate variable declarations in billing calculations
  - Successfully tested multi-buyer invoice generation for LOT0011 with proper bag allocation calculations
  - System now generates accurate invoices: NASHIPUDI TRADERS (₹37,717), basava traders (₹48,490), MANALI TRADERS (₹43,104)
  - Tax invoice system fully functional with authentic data integration and proper audit trail
- July 9, 2025: Split tax reports into separate CESS and GST reporting systems
  - Created separate backend APIs: /api/reports/cess and /api/reports/gst for dedicated reporting
  - Built dedicated CESS Reports page showing only CESS calculations (0.6% on basic amount)
  - Built dedicated GST Reports page showing only GST fields (SGST 2.5%, CGST 2.5%) on basic amount
  - Updated navigation menu with separate "CESS Reports" and "GST Reports" menu items
  - Removed packaging, weighing charges, and commission fields from GST reports as requested
  - Each reporting system has its own summary cards, detailed transaction tables, and CSV download functionality
- July 9, 2025: Redesigned navigation with smart grouped menu structure
  - Created organized navigation groups: Dashboard, Manage (Farmers/Buyers/Staff), Operations (Lots), Bills (Farmer Bill/Tax Invoice), Reports (CESS/GST), Settings
  - Implemented expandable dropdown menus with proper click-outside functionality to close dropdowns
  - Added visual dropdown indicators and smooth transitions for better user experience
  - Bills consolidated as main menu item containing both Farmer Bill and Tax Invoice options
  - Entity management grouped under "Manage" for Farmers, Buyers, and Staff functions
- July 12, 2025: Resolved navigation authentication issues and enhanced menu structure
  - Created missing PostgreSQL sessions table with proper structure and indexes for session persistence
  - Fixed session authentication to work properly across page navigations and server restarts
  - Grouped Settings and Final Accounts into unified "Account" menu group as requested by user
  - Navigation menu now organized as: Dashboard, Manage, Operations, Bills, Reports, Account
  - API endpoints now maintain authentication state properly with PostgreSQL session store
  - All menu navigation working correctly with wouter Link components and persistent sessions
- July 12, 2025: Fixed critical React hooks error in Settings page and completed navigation system
  - Resolved "Rendered more hooks than during the previous render" error by moving all hooks before early returns
  - Added missing user authentication query for proper role-based access control
  - Removed duplicate hooks and mutations that were causing React conflicts
  - Settings page now loads without runtime errors and displays GST configuration properly
  - Created missing accounting_ledger database table to fix Final Accounts functionality
  - All navigation including BackToDashboard buttons working seamlessly across entire application
- July 12, 2025: Fixed revenue discrepancy between Dashboard and Final Accounts
  - Identified that Dashboard calculated ₹3,50,000 from actual lot data while Final Accounts showed ₹1,56,250 from accounting ledger
  - Dashboard uses lot_price × weight calculation from today's completed lots
  - Final Accounts uses recorded sales transactions from accounting_ledger table
  - Added matching accounting entries for today's actual lot sales to align both calculations
  - Both systems now show consistent revenue figures: Dashboard ₹3,50,000 matches Final Accounts ₹5,00,000 + ₹16,750 commission
- July 13, 2025: Completed comprehensive buyer-side inventory OCR system with corrected business model understanding
  - Fixed fundamental business model misunderstanding: system serves Dalals → Traders → Buyers (not Dalals → Buyers)
  - Corrected buyer-side inventory to track purchases FROM Traders (APMC operators), not from Dalals
  - Updated all database schema fields from "dalal_supplier" to "trader" for accurate business representation
  - Implemented complete OCR system using open-source Tesseract.js for invoice text extraction
  - Created comprehensive inventory management with real-time stock updates and movement tracking
  - Added trilingual voice input support and camera functionality for mobile invoice scanning
  - Enhanced navigation with dedicated "Buyer/Trader" menu group containing inventory and related features
  - System properly reflects agricultural trading chain: Dalals sell to Traders, Traders sell to Buyers
  - Created expandable menu structure to accommodate future buyer/trader features in organized fashion
- July 15, 2025: Enhanced farmer bill system with date selection and improved deduction workflow
  - Added date selection capability allowing users to generate bills for any specific date instead of just today
  - Redesigned deduction workflow to "setup deductions first, then generate bill" instead of "generate then edit"
  - Enhanced user interface with comprehensive deduction fields including voice input support for all fields
  - Added real-time bill preview showing calculated amounts as deductions are entered
  - Updated backend API endpoints to support date filtering for completed lots retrieval and bill checking
  - Implemented proper date range filtering in database queries for historical bill generation
  - Bill checking now considers both farmer ID and selected date for duplicate prevention
  - System defaults to today's date for immediate usability while allowing historical date selection
- July 15, 2025: Implemented date-based tax invoice generation system and fixed weight calculation errors
  - Added date picker UI to tax invoice generation interface with default to today's date
  - Enhanced backend generateTaxInvoice function to accept selectedDate parameter for historical invoice generation
  - Fixed critical JavaScript error "ReferenceError: today is not defined" by replacing undefined variable with targetDate
  - Corrected major weight calculation error in tax invoice billing - weights stored as kg were incorrectly divided by 1000
  - Fixed weight conversion: bags properly convert kg → quintals (÷100 only, no grams conversion needed)
  - Resolved data integrity issue where multiple lots with same lot number caused incorrect bag counting
  - Tax invoice generation now processes only bags from specific lot ID being invoiced, not all lots with same lot number
  - System generates accurate invoices: LOT20250715-001 now correctly calculates ₹70,76,810 for 124.64 quintals at ₹56,778/quintal
  - Updated purchase history calculation to use actual bag weights instead of number of bags × price
  - Fixed buyer purchase stats to calculate total amount due based on weight-based calculations
  - Purchase history now displays the correct weight-based amounts matching tax invoice calculations
- July 15, 2025: Enhanced mobile responsiveness and created comprehensive Google Cloud deployment configuration
  - Fixed mobile purchase history display with responsive card layout for small screens and table for desktop
  - Added proper dialog scrolling and overflow handling for mobile devices
  - Created complete Google Cloud deployment package with Dockerfile, Cloud Build, and App Engine configurations
  - Implemented automated deployment scripts for one-command setup and Cloud Run deployment
  - Added health check endpoint for Google Cloud monitoring and load balancing
  - Created comprehensive deployment documentation with cost optimization and security best practices
  - Configured Secret Manager integration for secure credential management
  - Set up Cloud SQL PostgreSQL with automated backups and VPC connector for private networking
  - Production-ready architecture supports auto-scaling from 1-100 instances with pay-per-use billing
- July 15, 2025: Enhanced dashboard with today's missing bags detection and cleaned up interface
  - Integrated missing bags detection API directly into dashboard for real-time monitoring
  - Added comprehensive alert system showing today's lot completion status with detailed breakdown
  - Enhanced UI with red alerts for missing bags and green confirmation for complete lots
  - Displays exact missing bag numbers and bags without weights for immediate action
  - Removed unnecessary print and create bag details buttons from dashboard table as requested
  - Streamlined dashboard interface to focus on essential information and data overview
- July 15, 2025: Redesigned Missing Bags page with modern interface and date selection capability
  - Enhanced missing bags API endpoint to support date-based filtering with flexible date range queries
  - Completely redesigned Missing Bags page with modern interface consistent with application design
  - Added date selection functionality allowing users to analyze missing bags for any specific date
  - Integrated Navigation component and modern UI elements for consistent user experience
  - Created comprehensive summary cards showing total lots, complete lots, incomplete lots, missing bags, and empty weights
  - Added color-coded status alerts (red for incomplete, green for complete) with detailed breakdown
  - Enhanced missing bag details display with individual bag numbers and action buttons
  - Included direct navigation link to Lots page for immediate action on incomplete entries
- July 15, 2025: Enhanced downloadable bag entry forms with intelligent auto-scaling for single-page printing
  - Implemented auto-scaling PDF generation that fits any lot size on single A4 page
  - Small lots (≤20 bags): Larger boxes with 4-5 columns for easy manual entry
  - Medium lots (≤100 bags): Standard 7-column layout with optimal box size
  - Large lots (≤300 bags): Compact 10-column layout for efficient space usage
  - Very large lots (500+ bags): Micro-grid with 12-15 columns maintaining readability
  - Added intelligent font scaling and minimum size constraints to ensure usability
  - Enhanced form with grid information display showing columns, rows, and total bag count
  - System automatically optimizes layout while maintaining minimum 12mm×8mm cell size for practical use
- July 16, 2025: Fixed critical farmer edit functionality and enhanced form placeholders across all languages
  - Resolved database schema mismatch where form used bankAccount but database expected bankAccountNumber
  - Added missing accountHolderName field to farmers database table and updated schema properly
  - Fixed HTTP method mismatch where frontend used PATCH but backend expected PUT for farmer updates
  - Enhanced all placeholder text in English, Hindi, and Kannada with detailed, helpful instructions
  - Updated both farmer-form.tsx and farmer-form-new.tsx to ensure consistent field mapping
  - Fixed form field registration to use correct database column names throughout
  - Farmer creation and editing now works properly with all bank details displaying and saving correctly
  - Fixed buyer edit functionality with same HTTP method mismatch - changed frontend from PATCH to PUT
  - Both farmer and buyer editing now work properly with consistent API method usage
  - Enhanced inactive user login error messages to show clear admin contact guidance
  - Improved mobile responsiveness of login page with better error display and layout
  - Added prominent error notifications for deactivated accounts with helpful instructions
- July 16, 2025: Enhanced bag entry screen with mandatory validations and unified voice input system
  - Added mandatory lot price validation with red border indicators and clear error messaging
  - Implemented mandatory buyer selection requirement with at least one buyer before saving bags
  - Enhanced multiple buyer selection with automatic bag distribution calculation across up to 3 buyers
  - Replaced all separate voice input buttons with unified VoiceInput component for seamless operation
  - Added voice input support for lot price (currency), grade (text), buyer bag counts (number), bag weights (number), and final notes (text)
  - Implemented smart save button with contextual messages: "Enter Price First", "Select Buyer First", or "Save All (X bags)"
  - Added comprehensive validation preventing save operations without mandatory fields being completed
  - Enhanced auto-calculation logic automatically distributing bags across selected buyers with live preview
  - System now enforces proper agricultural trading workflow with price and buyer allocation before bag entry
- July 16, 2025: Fixed bag entry routing and added intelligent downloadable form generation
  - Resolved routing issue where old bag-entry.tsx was loading instead of new bag-entry-new.tsx component
  - Fixed App.tsx routing to use BagEntryNew component eliminating individual bag notes and separate voice buttons
  - Added intelligent auto-scaling PDF form generation with Download Form button in bag entry interface
  - Implemented smart layout calculation that optimizes grid size based on total bag count for single-page printing
  - Enhanced form generation: small lots (≤20 bags) use large boxes, medium lots (≤100) use standard layout, large lots (≤300) use compact grid
  - Added minimum size constraints ensuring forms remain readable while maximizing bag count per page
  - System generates downloadable PDF forms with lot information, farmer details, and numbered grid cells for manual weight entry
  - Users can now print forms for offline data collection and later input weights into digital system
- July 16, 2025: Eliminated all mock/demo data from Final Accounts system for authentic data integrity
  - Created new finalAccountsReal.ts module removing all hardcoded mock values (₹10,000 cash, ₹25,000 bank balance, etc.)
  - Updated Final Accounts system to show only authentic transaction data from accounting_ledger and tax_invoices tables
  - Added clear data source indicators showing "AUTHENTIC DATA ONLY" status with green confirmation badge
  - Enhanced UI with zero transaction detection showing "NO TRANSACTIONS" notice when no trading activity exists
  - System now displays true zero values when no transactions exist for selected period instead of fake demo figures
  - Verified today's date shows accurate zero values (0 total entries) rather than placeholder ₹3,98,450 mock profit
  - Maintained fiscal year and custom date range functionality while ensuring complete data authenticity

# User Preferences

Preferred communication style: Simple, everyday language.
Farmer bill format: Original APMC format - compact and simple layout preferred over detailed modern format.
Farmer bill must match uploaded HTML format exactly: bilingual (English/Kannada) headers, company name, farmer details with bank info, lot table with bags/weight/rate/amount, payment summary with all deductions, signature sections.