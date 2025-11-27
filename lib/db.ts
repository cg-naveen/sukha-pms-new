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

// Function to automatically handle password encoding in connection string
function prepareConnectionString(url: string): string {
  try {
    // Parse the connection string
    const dbUrl = new URL(url)
    
    // If password contains special characters that aren't already encoded, encode them
    const password = dbUrl.password
    if (password && !password.includes('%')) {
      // Password might need encoding - but let's try without first
      // Only encode if connection fails
      return url
    }
    
    return url
  } catch {
    // If URL parsing fails, return as-is
    return url
  }
}

// Supabase PostgreSQL connection
// Clean connection string by removing problematic SSL parameters
let cleanUrl = process.env.DATABASE_URL
if (cleanUrl.includes('sslcert=disable')) {
  cleanUrl = cleanUrl.replace('&sslcert=disable', '').replace('sslcert=disable&', '').replace('?sslcert=disable', '?').replace('&sslcert=disable', '')
}

// Try to parse and use connection parameters directly to avoid URL encoding issues
let poolConfig: any = {
  ssl: { rejectUnauthorized: false },
  // Optimize for serverless: smaller connection pool, faster timeouts
  max: process.env.NODE_ENV === 'production' ? 5 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true
}

try {
  // Try parsing as URL to extract components
  const dbUrl = new URL(cleanUrl)
  
  // Use individual connection parameters instead of connection string
  // This avoids URL encoding issues with passwords
  poolConfig = {
    ...poolConfig,
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 5432,
    database: dbUrl.pathname.replace('/', '') || 'postgres',
    user: dbUrl.username,
    password: dbUrl.password, // Password used directly, no encoding needed!
  }
  
  // Clean URL is not needed when using individual params
  cleanUrl = undefined as any
} catch {
  // If parsing fails, fall back to connection string
  cleanUrl = prepareConnectionString(cleanUrl)
}

// Pool configuration optimized for both local and serverless (Vercel) environments
const pgPool = new Pool(cleanUrl ? { 
  connectionString: cleanUrl,
  ...poolConfig
} : poolConfig)

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
      diagnostic = 'Password authentication failed. Check if DATABASE_URL password is correct and URL-encoded if needed.'
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
