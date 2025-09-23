import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import * as schema from '../shared/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set')
}

// Use Neon for production, regular pg for local development
let db: any

if (process.env.DATABASE_URL.includes('neon.tech') || process.env.NODE_ENV === 'production') {
  // Neon serverless for production
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  db = drizzle(pool, { schema })
} else {
  // Local PostgreSQL for development
  const { Pool: PgPool } = require('pg')
  const { drizzle: pgDrizzle } = require('drizzle-orm/node-postgres')
  const pgPool = new PgPool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: false
  })
  db = pgDrizzle(pgPool, { schema })
}

export { db }
