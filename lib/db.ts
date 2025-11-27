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


// Supabase PostgreSQL connection - use connection string exactly as provided

const pgPool = new Pool({ 
  connectionString: dbUrl,
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
