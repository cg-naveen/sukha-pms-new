import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../shared/schema'
import dotenv from 'dotenv'

// Load environment variables from .env.local (only in development)
// In production (Vercel), environment variables are provided directly
if (process.env.NODE_ENV !== 'production' && !process.env.SUPABASE_URL) {
  dotenv.config({ path: '.env.local' })
}

// Use DATABASE_URL directly - no construction, use exactly as provided
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Get the connection string from Supabase Settings > Database > Connection string')
}

const connectionString = process.env.DATABASE_URL

const pgPool = new Pool({ 
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  max: process.env.NODE_ENV === 'production' ? 5 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // Increased to 30 seconds
  allowExitOnIdle: true,
  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
})

// Add error handlers to the pool
pgPool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  // Don't exit the process, just log the error
})

pgPool.on('connect', async (client) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Database connection established')
  }
  // Set statement timeout on each new connection
  try {
    await client.query('SET statement_timeout = 30000')
  } catch (err) {
    // Ignore errors setting timeout
  }
})

pgPool.on('acquire', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Client acquired from pool')
  }
})

pgPool.on('remove', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Client removed from pool')
  }
})

const db = drizzle(pgPool, { schema })

// Test connection function with retry logic
export async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await Promise.race([
        pgPool.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 30000)
        )
      ])
      return { success: true }
    } catch (error: any) {
      const isLastAttempt = i === retries - 1
      console.error(`Database connection test failed (attempt ${i + 1}/${retries}):`, error?.message)
      
      if (isLastAttempt) {
        return { 
          success: false, 
          error: error?.message || 'Unknown error',
          code: error?.code || 'UNKNOWN'
        }
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
  
  return { 
    success: false, 
    error: 'Connection failed after all retries',
    code: 'RETRY_EXHAUSTED'
  }
}

export { db }
