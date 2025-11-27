import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../shared/schema'
import dotenv from 'dotenv'

// Load environment variables from .env.local (only in development)
// In production (Vercel), environment variables are provided directly
if (process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL) {
  dotenv.config({ path: '.env.local' })
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Please configure your Supabase connection string in .env.local')
}


// Supabase PostgreSQL connection
// Clean connection string by removing problematic SSL parameters
let cleanUrl = process.env.DATABASE_URL
if (cleanUrl.includes('sslcert=disable')) {
  cleanUrl = cleanUrl.replace('&sslcert=disable', '').replace('sslcert=disable&', '').replace('?sslcert=disable', '?').replace('&sslcert=disable', '')
}

// Pool configuration optimized for both local and serverless (Vercel) environments
// Use connection string directly - Supabase provides it in the correct format
// This avoids any parsing issues with usernames, passwords, or special characters
const pgPool = new Pool({ 
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false },
  // Optimize for serverless: smaller connection pool, faster timeouts
  max: process.env.NODE_ENV === 'production' ? 5 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true
})

// Add error handlers to the pool
pgPool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

pgPool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Database connection established')
  }
})

const db = drizzle(pgPool, { schema })

// Test connection function
export async function testConnection() {
  try {
    await pgPool.query('SELECT 1')
    return { success: true }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    const errorCode = error?.code || 'UNKNOWN'
    
    // Check for common connection string issues
    let diagnostic = ''
    if (errorCode === 'ENOTFOUND') {
      diagnostic = 'DNS lookup failed. Check if DATABASE_URL hostname is correct. Supabase uses pooler.supabase.com, not db.[project].supabase.co'
    } else if (errorCode === 'ETIMEDOUT' || errorCode === 'ECONNREFUSED') {
      diagnostic = 'Connection timeout or refused. Verify DATABASE_URL and check if Supabase project is active.'
    } else if (errorMessage.includes('password authentication failed')) {
      diagnostic = 'Password authentication failed. Check if DATABASE_URL password is correct.'
    } else if (errorMessage.includes('Tenant or user not found') || errorCode === 'XX000') {
      diagnostic = 'Authentication failed - username or tenant not found. IMPORTANT: When using pooler.supabase.com hostname, you MUST use the EXACT connection string from Supabase dashboard. For pooler hostname, try using Connection Pooling (port 6543) with username format: postgres.[PROJECT-REF]. Or get the Direct Connection string from Supabase dashboard which will have the correct format.'
    }
    
    console.error('Database connection test failed:', {
      message: errorMessage,
      code: errorCode,
      diagnostic,
      stack: error?.stack
    })
    
    return { 
      success: false, 
      error: errorMessage,
      code: errorCode,
      diagnostic
    }
  }
}

export { db }
