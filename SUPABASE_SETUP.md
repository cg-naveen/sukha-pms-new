# Supabase Database Setup

## Getting Your Database Connection String

1. Go to your Supabase project: https://dqxvknzvufbvajftvvcm.supabase.co
2. Navigate to **Settings** → **Database**
3. Find the **Connection string** section
4. Copy the **Connection pooling** connection string (recommended) or **Direct connection** string
5. Replace `[YOUR-PASSWORD]` in `.env.local` with your actual database password

## Connection String Format

The connection string should look like:
```
postgresql://postgres.dqxvknzvufbvajftvvcm:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Or for direct connection:
```
postgresql://postgres.dqxvknzvufbvajftvvcm:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

## After Setting Up

1. Update `.env.local` with your database password
2. Run the migration to add missing columns:
   ```bash
   npm run db:migrate
   ```
   Or run the SQL directly in Supabase SQL Editor:
   ```sql
   ALTER TABLE rooms 
   ADD COLUMN IF NOT EXISTS number_of_beds INTEGER NOT NULL DEFAULT 1;

   ALTER TABLE residents 
   ADD COLUMN IF NOT EXISTS billing_date INTEGER NOT NULL DEFAULT 1;
   ```

3. Push the schema to Supabase:
   ```bash
   npm run db:push
   ```

4. Restart your dev server:
   ```bash
   npm run dev
   ```

