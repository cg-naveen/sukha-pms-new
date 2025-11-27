import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../shared/schema'
import dotenv from 'dotenv'

// Load environment variables from .env.local (only in development)
// In production (Vercel), environment variables are provided directly
if (process.env.NODE_ENV !== 'production' && !process.env.SUPABASE_URL) {
  dotenv.config({ path: '.env.local' })
}

// Construct connection string from Supabase URL
let connectionString: string

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if provided (for backward compatibility)
  connectionString = process.env.DATABASE_URL
} else if (process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
  // Construct from Supabase URL and database password
  // Extract project ref from SUPABASE_URL (e.g., https://dqxvknzvufbvajftvvcm.supabase.co -> dqxvknzvufbvajftvvcm)
  const supabaseUrl = process.env.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')
  // For direct connection, use pooler hostname with port 5432 and username 'postgres'
  // The pooler hostname works for both pooling (6543) and direct (5432) connections
  // URL encode password if it contains special characters
  const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)
  connectionString = `postgresql://postgres:${password}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
} else {
  throw new Error('Either DATABASE_URL or (SUPABASE_URL and SUPABASE_DB_PASSWORD) must be set. Get SUPABASE_DB_PASSWORD from Supabase Settings > Database > Connection string')
}

const pgPool = new Pool({ 
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
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
    console.error('Database connection test failed:', error?.message)
    return { 
      success: false, 
      error: error?.message || 'Unknown error',
      code: error?.code || 'UNKNOWN'
    }
  }
}

export { db }
