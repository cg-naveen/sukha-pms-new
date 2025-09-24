import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless'
import { Pool as NeonPool } from '@neondatabase/serverless'
import * as schema from '../shared/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set')
}

// Use Neon for production, regular pg for local development
let db: any

if (process.env.DATABASE_URL.includes('neon.tech')) {
  // Use Neon serverless only when the URL points to Neon
  const pool = new NeonPool({ connectionString: process.env.DATABASE_URL })
  db = neonDrizzle(pool, { schema })
} else {
  // Use node-postgres for non-Neon databases (works in dev and production)
  const { Pool: PgPool } = require('pg')
  const { drizzle: pgDrizzle } = require('drizzle-orm/node-postgres')
  const pgPool = new PgPool({ connectionString: process.env.DATABASE_URL })
  db = pgDrizzle(pgPool, { schema })
}

export { db }
