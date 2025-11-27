# Vercel Deployment Guide

## Environment Variables Setup

To deploy to Vercel, you need to configure the following environment variables in your Vercel project settings:

### Required Environment Variables

1. **DATABASE_URL**
   - **IMPORTANT**: Get the correct connection string from your Supabase dashboard
   - Go to: **Settings** → **Database** → **Connection string**
   - Use the **Connection pooling** string (port 6543) or **Direct connection** string (port 5432)
   - Format should be: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:[PORT]/postgres`
   - Example: `postgresql://postgres.dqxvknzvufbvajftvvcm:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
   - **DO NOT use** `db.[PROJECT-REF].supabase.co` - this hostname does not exist!

2. **SUPABASE_URL**
   ```
   https://dqxvknzvufbvajftvvcm.supabase.co
   ```

3. **SUPABASE_ANON_KEY**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeHZrbnp2dWZidmFqZnR2dmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwOTMxMzAsImV4cCI6MjA3OTY2OTEzMH0.866f2UBDqaaMcxwGTPYjd1g0BfKoqlaZknz4t_8d2Rg
   ```

4. **SESSION_SECRET**
   - Generate a secure random string: `openssl rand -base64 32`
   - Use the same value for all environments (production, preview, development)

5. **JWT_SECRET**
   - Generate a secure random string: `openssl rand -base64 32`
   - Used for JWT token signing and verification
   - Use the same value for all environments (production, preview, development)
   - **Important**: This is required for authentication to work

### Optional Environment Variables

- `BREVO_API_KEY` - For email notifications
- `MAILERLITE_API_KEY` - Alternative email service
- `ONEDRIVE_CLIENT_ID` - For OneDrive integration
- `ONEDRIVE_CLIENT_SECRET` - For OneDrive integration
- `ONEDRIVE_TENANT_ID` - For OneDrive integration (defaults to 'common')
- `ONEDRIVE_REFRESH_TOKEN` - For OneDrive integration
- `ONEDRIVE_ROOT_FOLDER` - OneDrive folder path (defaults to 'SukhaPMS/Documents')
- `CRON_SECRET` - For secure cron job execution

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for the appropriate environments:
   - **Production**: Live production environment
   - **Preview**: Preview deployments (pull requests)
   - **Development**: Local development (optional)

## Database Connection

The application uses a direct connection to Supabase PostgreSQL, optimized for serverless environments:

- **Connection Pooling**: Configured with smaller pool size (5 connections) for serverless
- **Timeouts**: Optimized for fast connection establishment and cleanup
- **SSL**: Required and properly configured for Supabase

## Deployment Steps

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Update Supabase configuration"
   git push origin main
   ```

2. **Vercel will automatically deploy** when you push to the main branch

3. **Verify deployment**:
   - Check build logs in Vercel dashboard
   - Test the application endpoints
   - Verify database connections are working

## Troubleshooting

### Database Connection Issues

If you encounter connection errors on Vercel:

1. **Verify environment variables are set correctly** in Vercel dashboard
2. **Check the DATABASE_URL format** - ensure it matches exactly
3. **Verify Supabase project is active** and accessible
4. **Check Vercel function logs** for detailed error messages

### Build Failures

1. **Check Node.js version** - Ensure it matches your local environment
2. **Verify all dependencies** are in `package.json`
3. **Check build logs** for specific error messages

### Runtime Errors

1. **Check function logs** in Vercel dashboard
2. **Verify environment variables** are available at runtime
3. **Test database connection** using Vercel's function logs

## Connection String Format

**⚠️ CRITICAL**: Always get your connection string from the Supabase dashboard. Do not construct it manually.

### Correct Format (from Supabase Dashboard)

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Find the **Connection string** section
4. Copy either:
   - **Connection pooling** (recommended for serverless): Port 6543
   - **Direct connection**: Port 5432

The connection string will look like:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:[PORT]/postgres
```

Example:
```
postgresql://postgres.dqxvknzvufbvajftvvcm:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### Common Mistakes to Avoid

❌ **WRONG**: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- The hostname `db.[PROJECT-REF].supabase.co` does NOT exist
- This will cause `ENOTFOUND` DNS errors

✅ **CORRECT**: Use the connection string from Supabase dashboard with `pooler.supabase.com` hostname

### Password Encoding

If your password contains special characters, URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `/` → `%2F`
- `:` → `%3A`

Example: If your password is `pass@word`, use `pass%40word` in the connection string.

## Notes

- The direct connection works reliably in both local and Vercel environments
- Connection pooling is handled by the pg Pool with optimized settings for serverless
- SSL is required and automatically configured
- Environment variables are automatically loaded in production (no .env.local needed)

