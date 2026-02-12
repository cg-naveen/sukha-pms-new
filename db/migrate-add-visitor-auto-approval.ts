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
  let connectionString = process.env.DATABASE_URL!
  
  const urlMatch = connectionString.match(/^postgresql:\/\/([^:]+):([^@]+)@(.+)$/)
  if (urlMatch) {
    const [, username, password, rest] = urlMatch
    if (password.includes('@') && !password.includes('%40')) {
      const encodedPassword = password.replace(/@/g, '%40')
      connectionString = `postgresql://${username}:${encodedPassword}@${rest}`
      console.log('Encoded password in connection string')
    }
  }
  
  if (connectionString.includes('sslcert=disable')) {
    connectionString = connectionString.replace('&sslcert=disable', '').replace('sslcert=disable&', '').replace('?sslcert=disable', '?').replace('&sslcert=disable', '')
  }
  
  const sslConfig = {
    rejectUnauthorized: false
  }

  const pool = new Pool({ 
    connectionString: connectionString,
    ssl: sslConfig
  })

  try {
    console.log('Starting migration: Adding visitor_auto_approval field to settings table...')
    
    await pool.query(`
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS visitor_auto_approval BOOLEAN NOT NULL DEFAULT false;
    `)
    console.log('✓ Added visitor_auto_approval column to settings table')
    
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
