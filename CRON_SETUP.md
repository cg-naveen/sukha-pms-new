# Automated Billing Generation Setup

This document explains how to set up automated billing generation for residents based on their `billingDate` field.

## How It Works

The system automatically generates monthly billings for residents on their specified billing date (1-31 of each month). The billing generation:

1. Checks all residents daily
2. Finds residents whose `billingDate` matches today's day of month
3. Verifies they have active occupancy
4. Creates a new billing with the room's monthly rate
5. Sets the due date to the billing date of the current month
6. Prevents duplicate billings for the same month

## Setup Options

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

If you're deploying to Vercel, the cron job is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/billings/generate",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs daily at 2:00 AM UTC.

**To enable:**
1. Add `CRON_SECRET` to your Vercel environment variables (generate a secure random string)
2. The cron job will automatically run daily

**To test manually:**
```bash
curl -X POST https://your-domain.com/api/billings/generate \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 2: External Cron Service

If you're not using Vercel or want more control, use an external cron service:

**Services:**
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [Cronitor](https://cronitor.io)

**Setup:**
1. Create a cron job that runs daily (e.g., `0 2 * * *` for 2 AM daily)
2. Set the URL to: `https://your-domain.com/api/billings/generate`
3. Add header: `Authorization: Bearer YOUR_CRON_SECRET`
4. Set method to `POST`

### Option 3: Manual Trigger (Admin)

Admins can manually trigger billing generation:

1. Navigate to the Billing page
2. Click "Generate Monthly Billings" button (if implemented in UI)
3. Or call the API directly:
   ```bash
   curl -X POST https://your-domain.com/api/billings/generate \
     -H "Cookie: your-session-cookie"
   ```

## Environment Variables

Add to your `.env.local`:

```bash
# Cron secret for automated billing generation
CRON_SECRET=your-secure-random-string-here
```

Generate a secure secret:
```bash
# Using openssl
openssl rand -base64 32

# Or using node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## API Endpoint

**Endpoint:** `POST /api/billings/generate`

**Authentication:**
- Admin/Staff: Session-based (for manual triggers)
- Cron Job: Bearer token with `CRON_SECRET`

**Response:**
```json
{
  "message": "Billing generation completed: 5 generated, 10 skipped",
  "results": {
    "generated": 5,
    "skipped": 10,
    "errors": []
  },
  "date": "2025-01-15"
}
```

## Testing

To test the billing generation:

1. Set a resident's `billingDate` to today's day of month
2. Ensure the resident has active occupancy
3. Call the API endpoint manually
4. Check that a new billing was created

## Troubleshooting

**Billings not generating:**
- Check that residents have `billingDate` set (1-31)
- Verify residents have active occupancy
- Check that rooms have `monthlyRate` set
- Review server logs for errors

**Duplicate billings:**
- The system checks for existing billings with the same `dueDate`
- If duplicates appear, check the `dueDate` calculation logic

**Cron not running:**
- Verify `CRON_SECRET` is set in environment variables
- Check Vercel cron job status in dashboard
- Review API logs for authentication errors

