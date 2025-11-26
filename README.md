# Sukha Senior Resort - Property Management System

A comprehensive property management system built with Next.js 15.4.4 for managing residents, rooms, billing, and visitors with QR code verification.

## Features

- **User Management**: Role-based access control (superadmin, admin, staff, user)
- **Resident Management**: Complete resident profiles with next-of-kin information
- **Room Management**: Room inventory with occupancy tracking
- **Billing System**: Payment tracking with Malaysian Ringgit (RM) currency
- **Visitor Management**: QR code-based visitor approval system
- **Dashboard**: Real-time statistics and activity monitoring

## Tech Stack

- **Frontend**: Next.js 15.4.4, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with Next.js middleware
- **UI**: Radix UI + shadcn/ui + Tailwind CSS
- **Email**: Brevo/SendGrid integration
- **Deployment**: Optimized for Vercel

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Supabase Database Configuration
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@[host]:[port]/postgres"
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"

# Session Secret
SESSION_SECRET="your-secret-key-change-in-production"

# Email Configuration (Optional)
BREVO_API_KEY="..."
MAILERLITE_API_KEY="..."

# OneDrive Integration (Optional - falls back to local storage if not set)
ONEDRIVE_CLIENT_ID="..."
ONEDRIVE_CLIENT_SECRET="..."
ONEDRIVE_TENANT_ID="..."  # Optional, defaults to 'common'
ONEDRIVE_REFRESH_TOKEN="..."
ONEDRIVE_ROOT_FOLDER="SukhaPMS/Documents"  # Optional

# Cron Job Configuration (Required for automated billing generation)
CRON_SECRET="your-secure-random-string-here"  # Generate with: openssl rand -base64 32
```

See `SUPABASE_SETUP.md` for detailed Supabase setup instructions.
See `ONEDRIVE_SETUP.md` for detailed OneDrive setup instructions.

## Local Development

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Seed database
npm run db:seed

# Start development server
npm run dev
```

## Deployment to Vercel

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Currency Display

All monetary values are displayed in Malaysian Ringgit (RM).

## License

MIT License