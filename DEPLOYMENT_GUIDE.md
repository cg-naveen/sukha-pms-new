# Deployment Guide: Merging to cg-pms Repository

## Overview
This guide will help you merge the Next.js property management system into your existing `cg-pms` git repository.

## Prerequisites
- Access to your `cg-pms` repository
- Git installed locally
- Node.js 18+ installed

## Step 1: Clone Your Repository
```bash
git clone https://github.com/yourusername/cg-pms.git
cd cg-pms
```

## Step 2: Create Migration Branch
```bash
git checkout -b nextjs-migration
```

## Step 3: Copy Files from Replit
Copy these essential files and directories from your Replit workspace to your local repository:

### Core Application Files
```
app/                    # Next.js app directory
├── layout.tsx
├── page.tsx
├── providers.tsx
├── auth/
├── dashboard/
├── rooms/
├── residents/
├── billings/
├── visitors/
└── api/               # All API routes

client/                # Frontend components
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── pages/

shared/               # Shared schemas
└── schema.ts

server/               # Server utilities
├── auth.ts
└── storage.ts

lib/                  # Authentication
└── auth.ts

db/                   # Database
├── index.ts
└── seed.ts
```

### Configuration Files
```
package.json
next.config.js
tsconfig.json (rename from tsconfig.next.json)
tailwind.config.ts
postcss.config.js
components.json
drizzle.config.ts
vercel.json
.env.example
.gitignore
README.md
middleware.ts
```

## Step 4: Install Dependencies
```bash
npm install
```

## Step 5: Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with your actual environment variables
```

## Step 6: Database Setup
```bash
npm run db:push
npm run db:seed
```

## Step 7: Test Locally
```bash
npm run dev
```
Visit http://localhost:3000 to verify everything works.

## Step 8: Commit Changes
```bash
git add .
git commit -m "feat: migrate to Next.js 15.4.4 with full property management system

- Complete Next.js migration from Express + React
- All API routes converted to Next.js API structure
- Authentication middleware updated for Next.js
- Property management features: residents, rooms, billing, visitors
- QR code visitor management system
- Malaysian Ringgit (RM) currency support
- Optimized for Vercel deployment"
```

## Step 9: Push and Create Pull Request
```bash
git push origin nextjs-migration
```

Then create a pull request on GitHub to merge into your main branch.

## Step 10: Deploy to Vercel
After merging:
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `DATABASE_URL` - Supabase database connection string
   - `SUPABASE_URL` - Supabase project URL
   - `SUPABASE_ANON_KEY` - Supabase anonymous key
   - `SESSION_SECRET` - Secure session secret
   - `BREVO_API_KEY` (optional)
   - `MAILERLITE_API_KEY` (optional)
3. Deploy will happen automatically

## Environment Variables Required for Vercel
```
# Supabase Configuration
DATABASE_URL=postgresql://postgres:Sukha123@@PMS@db.dqxvknzvufbvajftvvcm.supabase.co:5432/postgres
SUPABASE_URL=https://dqxvknzvufbvajftvvcm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeHZrbnp2dWZidmFqZnR2dmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwOTMxMzAsImV4cCI6MjA3OTY2OTEzMH0.866f2UBDqaaMcxwGTPYjd1g0BfKoqlaZknz4t_8d2Rg

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-secure-secret

# Optional
BREVO_API_KEY=xkeysib-...
MAILERLITE_API_KEY=...
```

See `VERCEL_DEPLOYMENT.md` for detailed Vercel deployment instructions.

## Features Included
- ✅ User management with role-based access
- ✅ Resident management with next-of-kin
- ✅ Room inventory management
- ✅ Billing system with RM currency
- ✅ Visitor management with QR codes
- ✅ Dashboard with real-time statistics
- ✅ Email notifications (Brevo/MailerLite)
- ✅ PostgreSQL database with Drizzle ORM
- ✅ Next.js 15.4.4 for optimal performance
- ✅ Vercel deployment ready

## Support
If you encounter issues during migration, check:
1. All environment variables are set correctly
2. Database connection is working
3. Dependencies are installed properly
4. Next.js build passes without errors