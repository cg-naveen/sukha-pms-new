import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless'
import { Pool as NeonPool } from '@neondatabase/serverless'
import * as schema from '../shared/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set')
}

// Use Neon for production, regular pg for local development
let db: any

if (process.env.DATABASE_URL.includes('neon.tech')) {
  // Neon serverless for production
  const pool = new NeonPool({ connectionString: process.env.DATABASE_URL })
  db = neonDrizzle(pool, { schema })
} else {
  // Local PostgreSQL for development or Aiven
  const { Pool: PgPool } = require('pg')
  const { drizzle: pgDrizzle } = require('drizzle-orm/node-postgres')
  
  // Clean connection string by removing problematic SSL parameters
  let cleanUrl = process.env.DATABASE_URL
  if (cleanUrl.includes('sslcert=disable')) {
    cleanUrl = cleanUrl.replace('&sslcert=disable', '').replace('sslcert=disable&', '').replace('?sslcert=disable', '?').replace('&sslcert=disable', '')
  }
  
  const sslConfig = false // Disable SSL for now to test connection
  
  const pgPool = new PgPool({ 
    connectionString: cleanUrl,
    ssl: sslConfig
  })
  db = pgDrizzle(pgPool, { schema })
}

export { db }
