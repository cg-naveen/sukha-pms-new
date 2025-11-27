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
    console.log('Starting migration: Adding numberOfBeds to rooms and billingDate to residents...')
    
    // Add numberOfBeds column to rooms table if it doesn't exist
    await pool.query(`
      ALTER TABLE rooms 
      ADD COLUMN IF NOT EXISTS number_of_beds INTEGER NOT NULL DEFAULT 1;
    `)
    console.log('✓ Added number_of_beds column to rooms table')
    
    // Add billingDate column to residents table if it doesn't exist
    await pool.query(`
      ALTER TABLE residents 
      ADD COLUMN IF NOT EXISTS billing_date INTEGER NOT NULL DEFAULT 1;
    `)
    console.log('✓ Added billing_date column to residents table')
    
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

