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

// Try to parse and extract password to avoid URL encoding issues
// But if password has special chars, we'll use connection string directly
let useConnectionString = true
let poolConfig: any = {
  ssl: { rejectUnauthorized: false },
  // Optimize for serverless: smaller connection pool, faster timeouts
  max: process.env.NODE_ENV === 'production' ? 5 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true
}

try {
  const dbUrl = new URL(cleanUrl)
  const password = dbUrl.password
  
  // If password contains special characters that might need encoding, use connection string directly
  // Otherwise, extract components to avoid any encoding issues
  if (password && (password.includes('@') || password.includes('#') || password.includes('%') || password.includes(':'))) {
    // Password has special chars - use connection string as-is (Supabase handles it)
    useConnectionString = true
  } else {
    // Password is simple - can extract components
    poolConfig = {
      ...poolConfig,
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 5432,
      database: dbUrl.pathname.replace('/', '') || 'postgres',
      user: dbUrl.username,
      password: password,
    }
    useConnectionString = false
  }
} catch (error) {
  // If parsing fails, use connection string directly
  useConnectionString = true
}

// Pool configuration optimized for both local and serverless (Vercel) environments
const pgPool = new Pool(useConnectionString ? { 
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
      diagnostic = 'Password authentication failed. Check if DATABASE_URL password is correct.'
    } else if (errorMessage.includes('Tenant or user not found') || errorCode === 'XX000') {
      diagnostic = 'Authentication failed - username or tenant not found. For Supabase pooler connections, username should be "postgres.[PROJECT-REF]" (e.g., postgres.dqxvknzvufbvajftvvcm) for port 6543, or just "postgres" for port 5432. Check your connection string format.'
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
