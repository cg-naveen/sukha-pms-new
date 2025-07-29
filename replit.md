# Property Management System

## Overview

This is a comprehensive property management system built with Next.js for optimal deployment on Vercel. The application provides functionality for managing residents, rooms, billing, visitors, and users within a property management context. It features a full-stack Next.js architecture with React frontend and Next.js API routes, utilizing PostgreSQL for data persistence.

## Recent Changes (January 2025)

✓ **Comprehensive Property Management Enhancements**: Implemented all requested advanced features including:
   - Room assignments and sales referral tracking in resident management
   - PDF invoice upload functionality in billing system
   - Real-time notification system with bell component
   - Malaysian phone formatting with country codes (+60 default)
   - Enhanced visitor management with comprehensive form fields
✓ **Database Schema Updates**: Successfully updated schema with new fields (room_id, sales_referral, invoice_file, country_code, notifications table)
✓ **UI/UX Improvements**: Added scroll-area and separator components, enhanced forms with proper validation
✓ **File Upload System**: Implemented multer-based PDF upload for invoices with proper security
✓ **Fixed Critical Issues**: Resolved Select.Item empty value props and port conflicts

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 15.4.4 with React 18 and TypeScript
- **Routing**: Next.js App Router with file-based routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Styling**: Tailwind CSS with custom design system
- **Build Tool**: Next.js with SWC compiler
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Next.js API Routes with TypeScript
- **Framework**: Next.js serverless functions
- **Authentication**: Session-based auth with Next.js middleware
- **Session Storage**: PostgreSQL-backed session store with connect-pg-simple
- **Password Security**: Scrypt-based password hashing
- **API Design**: RESTful Next.js API routes with role-based access control

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with type-safe queries
- **Connection Management**: Connection pooling with neon serverless
- **Schema Management**: Drizzle migrations and schema definitions
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple

## Key Components

### Authentication & Authorization
- Role-based access control with four levels: superadmin, admin, staff, user
- Session-based authentication with secure password hashing
- Protected routes on frontend with automatic redirection
- Middleware-based route protection on backend

### Core Modules
1. **Dashboard**: Overview statistics and recent activity
2. **Residents**: Complete resident management with next-of-kin information
3. **Rooms**: Room inventory management with type and status tracking
4. **Billing**: Payment tracking and reminder system
5. **Visitors**: Visitor registration and approval workflow with QR codes
6. **Users**: User management for admin roles

### UI/UX Features
- Responsive design with mobile-first approach
- Dark/light theme support via CSS variables
- Mobile navigation with bottom tab bar
- Desktop sidebar navigation
- Toast notifications for user feedback
- Loading states and error handling

## Data Flow

### Frontend Data Flow
1. User interactions trigger React Query mutations
2. API requests sent to Express backend with credentials
3. Responses update React Query cache automatically
4. UI re-renders based on updated cache state
5. Optimistic updates for better user experience

### Backend Data Flow
1. Express middleware handles authentication and authorization
2. Route handlers validate input using Zod schemas
3. Drizzle ORM executes type-safe database queries
4. Responses formatted and returned to frontend
5. Session data persisted in PostgreSQL

### Database Schema
- **users**: Authentication and role management
- **residents**: Resident personal information
- **nextOfKin**: Emergency contact information
- **rooms**: Property inventory management
- **occupancy**: Resident-room relationships
- **billings**: Financial tracking and payments
- **visitors**: Guest management and approvals

## External Dependencies

### Email Services
- **SendGrid/Brevo**: Email delivery for notifications
- **MailerLite**: Newsletter and marketing email management
- Visitor notification system with QR code attachments

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Form management
- **Zod**: Schema validation

### Development Tools
- **Vite**: Fast build tool with HMR
- **TypeScript**: Type safety across the stack
- **Drizzle Kit**: Database migration management
- **TSX**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- Local development with Vite dev server
- Hot module replacement for frontend
- TSX for backend development server
- Environment-based configuration

### Production Build
- Vite builds optimized React bundle
- ESBuild compiles Node.js backend
- Static files served by Express in production
- Database migrations run via Drizzle Kit

### Environment Configuration
- Database connection via DATABASE_URL
- Session secrets for authentication
- Email service API keys
- Role-based feature flags

### Security Considerations
- HTTPS enforcement in production
- Secure session configuration
- CORS protection
- Input validation on all endpoints
- Role-based access control
- Password hashing with salt