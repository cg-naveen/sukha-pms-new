import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set')
  console.error('Please set DATABASE_URL in your environment or .env file')
  process.exit(1)
}

async function migrate() {
  // Clean connection string by removing problematic SSL parameters
  let cleanUrl = process.env.DATABASE_URL!
  if (cleanUrl.includes('sslcert=disable')) {
    cleanUrl = cleanUrl.replace('&sslcert=disable', '').replace('sslcert=disable&', '').replace('?sslcert=disable', '?').replace('&sslcert=disable', '')
  }

  // Supabase requires SSL
  const sslConfig = {
    rejectUnauthorized: false
  }

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: sslConfig
  })

  try {
    console.log('Starting migration: Adding bed_config to rooms...')

    // Add bed_config column to rooms table if it doesn't exist
    await pool.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS bed_config TEXT;
    `)
    console.log('✓ Added bed_config column to rooms table')

    // Backfill existing rows that don't have bed_config set
    await pool.query(`
      UPDATE rooms SET bed_config = CASE
        WHEN number_of_beds = 2 THEN 'twin_sharing'
        WHEN number_of_beds = 4 THEN 'quad_suite'
        ELSE 'single'
      END
      WHERE bed_config IS NULL;
    `)
    console.log('✓ Backfilled bed_config for existing rooms')

    console.log('Migration completed successfully!')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    await pool.end()
    process.exit(1)
  }
}

migrate()
