# APMC Agricultural Trading Management System

A comprehensive multi-tenant agricultural market management platform that streamlines complex market operations through intelligent technology and user-centric design.

## Features

### Core Functionality
- **Multi-tenant System**: Support for multiple APMC centers with data isolation
- **User Management**: Role-based access control (super_admin, admin, staff)
- **Farmer Management**: Complete farmer profiles with banking details
- **Lot Management**: Agricultural produce lots with pricing and logistics
- **Bag Entry**: Individual bag tracking with weight and grade
- **Buyer Management**: Customer management for purchase transactions

### Advanced Features
- **Voice Recognition**: Trilingual support (English, Hindi, Kannada) for hands-free data entry
- **Offline Capability**: Complete offline functionality with auto-sync when online
- **Mobile Printing**: Print-optimized layouts for mobile devices
- **Tax Compliance**: GST and CESS reporting for Indian agricultural standards
- **Bill Generation**: Professional farmer bills and tax invoices
- **Smart Navigation**: Grouped menu structure with expandable dropdowns

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and optimized builds
- Wouter for lightweight client-side routing
- TanStack Query for server state management
- Shadcn/ui components with Radix UI primitives
- Tailwind CSS with dark mode support

### Backend
- Node.js with Express.js
- TypeScript with ES modules
- Passport.js authentication with bcrypt
- PostgreSQL with Neon serverless driver
- Drizzle ORM for type-safe database operations

## Getting Started

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- Environment variables configured

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd apmc-trading-system
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_random_secret_key
NODE_ENV=development
```

4. Set up database
```bash
npm run db:push
```

5. Start development server
```bash
npm run dev
```

### Production Deployment

#### Using Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Set environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL=your_postgres_url`
   - `SESSION_SECRET=random_secret`
5. Deploy with build command: `npm run build`
6. Start command: `npm start`

#### Using Docker

```bash
docker build -t apmc-app .
docker run -p 5000:5000 apmc-app
```

## Default Login

- **Super Admin**: username `superadmin`, password `password`
- Create your first tenant (APMC organization) after login

## Key Workflows

1. **Tenant Setup**: Super admin creates APMC organizations
2. **Staff Management**: Tenant admins manage their users
3. **Farmer Registration**: Add farmers with complete profiles
4. **Lot Creation**: Create lots with voice input support
5. **Bag Entry**: Track individual bags with weights
6. **Billing**: Generate farmer bills and tax invoices
7. **Reporting**: CESS and GST compliance reports

## Voice Input

The system supports trilingual voice recognition:
- **English**: Natural speech recognition
- **Hindi**: Devanagari numerals and spoken words
- **Kannada**: Native numerals and voice input

## Mobile Support

- Responsive design for all screen sizes
- Mobile-optimized printing with downloadable HTML
- Touch-friendly interface for field operations
- Offline capability for remote areas

## License

MIT License - see LICENSE file for details

## Support

For technical support or feature requests, please contact the development team.