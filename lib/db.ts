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
  
// Supabase requires SSL
const sslConfig = {
  rejectUnauthorized: false
}

// Pool configuration optimized for both local and serverless (Vercel) environments
const pgPool = new Pool({ 
  connectionString: cleanUrl,
  ssl: sslConfig,
  // Optimize for serverless: smaller connection pool, faster timeouts
  max: process.env.NODE_ENV === 'production' ? 5 : 10, // Smaller pool for serverless
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 10000, // 10 seconds
  // Allow connections to be reused quickly
  allowExitOnIdle: true
})

const db = drizzle(pgPool, { schema })

export { db }
