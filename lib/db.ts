import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import * as schema from '../shared/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set')
}

// Use Neon for production, regular pg for local development
let db: any

if (process.env.DATABASE_URL.includes('neon.tech')) {
  // Neon serverless for production
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  db = drizzle(pool, { schema })
} else {
  // Local PostgreSQL for development or Aiven
  const { Pool: PgPool } = require('pg')
  const { drizzle: pgDrizzle } = require('drizzle-orm/node-postgres')
  const pgPool = new PgPool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false // Allow self-signed certs for Aiven
  })
  db = pgDrizzle(pgPool, { schema })
}

export { db }
