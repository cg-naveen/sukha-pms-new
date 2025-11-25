import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../shared/schema'

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

const pgPool = new Pool({ 
  connectionString: cleanUrl,
  ssl: sslConfig
})

const db = drizzle(pgPool, { schema })

export { db }
