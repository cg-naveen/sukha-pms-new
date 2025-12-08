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
  // Parse and properly encode the connection string
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
    console.log('Starting migration: Adding Wabot integration fields to settings table...')
    
    // Add Wabot API Base URL column
    await pool.query(`
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS wabot_api_base_url TEXT DEFAULT 'https://app.wabot.my/api';
    `)
    console.log('✓ Added wabot_api_base_url column to settings table')
    
    // Add visitor approval message template column
    await pool.query(`
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS visitor_approval_message_template TEXT;
    `)
    console.log('✓ Added visitor_approval_message_template column to settings table')
    
    // Add visitor rejection message template column
    await pool.query(`
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS visitor_rejection_message_template TEXT;
    `)
    console.log('✓ Added visitor_rejection_message_template column to settings table')
    
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

