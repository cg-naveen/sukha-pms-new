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
  // Use the connection string directly - handle password encoding if needed
  let connectionString = process.env.DATABASE_URL!
  
  // If the connection string has @@ in the password part, it means password contains @
  // We need to URL-encode the @ as %40
  // Format: postgresql://user:password@host:port/db
  // If password is "pass@word", it should be "pass%40word" in the URL
  
  // Try to parse and fix the connection string
  const urlMatch = connectionString.match(/^postgresql:\/\/([^:]+):([^@]+)@(.+)$/)
  if (urlMatch) {
    const [, username, password, rest] = urlMatch
    // If password contains unencoded @, encode it
    if (password.includes('@') && !password.includes('%40')) {
      const encodedPassword = password.replace(/@/g, '%40')
      connectionString = `postgresql://${username}:${encodedPassword}@${rest}`
      console.log('Encoded password in connection string')
    }
  }
  
  if (connectionString.includes('sslcert=disable')) {
    connectionString = connectionString.replace('&sslcert=disable', '').replace('sslcert=disable&', '').replace('?sslcert=disable', '?').replace('&sslcert=disable', '')
  }
  
  // Supabase requires SSL
  const sslConfig = {
    rejectUnauthorized: false
  }

  const pool = new Pool({ 
    connectionString: connectionString,
    ssl: sslConfig
  })

  try {
    console.log('Starting migration: Adding resident classification enum and column...')
    
    // Create the enum type if it doesn't exist
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE resident_classification AS ENUM ('independent', 'dependent', 'memory_care');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)
    console.log('✓ Created resident_classification enum type')
    
    // Add classification column to residents table if it doesn't exist
    await pool.query(`
      ALTER TABLE residents 
      ADD COLUMN IF NOT EXISTS classification resident_classification NOT NULL DEFAULT 'independent';
    `)
    console.log('✓ Added classification column to residents table')
    
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

