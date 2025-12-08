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
    console.log('Starting migration: Adding visitor_terms_and_conditions column to settings table...')
    
    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings' 
      AND column_name = 'visitor_terms_and_conditions';
    `)
    
    if (checkColumn.rows.length > 0) {
      console.log('✓ Column visitor_terms_and_conditions already exists')
      await pool.end()
      process.exit(0)
    }
    
    // Add the column
    await pool.query(`
      ALTER TABLE settings 
      ADD COLUMN visitor_terms_and_conditions TEXT;
    `)
    console.log('✓ Added visitor_terms_and_conditions column to settings table')
    
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

