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
    console.log('Starting migration: Removing bedroom types from room_type enum...')
    
    // First, update any existing rooms with bedroom types to studio_deluxe
    const updateResult = await pool.query(`
      UPDATE rooms 
      SET room_type = 'studio_deluxe'::room_type
      WHERE room_type::text IN ('1_bedroom', '2_bedroom', '3_bedroom');
    `)
    console.log(`✓ Updated ${updateResult.rowCount} rooms with bedroom types to studio_deluxe`)
    
    // Note: PostgreSQL doesn't support removing enum values directly
    // The enum values will remain in the type definition but won't be used
    // This is safe as long as we don't create new rooms with those types
    
    console.log('Migration completed successfully!')
    console.log('Note: The old enum values (1_bedroom, 2_bedroom, 3_bedroom) remain in the type definition')
    console.log('but are no longer used. All existing rooms have been updated to studio_deluxe.')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    await pool.end()
    process.exit(1)
  }
}

migrate()

