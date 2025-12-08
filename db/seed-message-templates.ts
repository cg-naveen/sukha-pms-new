import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set')
  process.exit(1)
}

async function seedTemplates() {
  // Parse and properly encode the connection string
  let connectionString = process.env.DATABASE_URL!
  
  // Handle password encoding
  const urlMatch = connectionString.match(/^postgresql:\/\/([^:]+):([^@]+)@(.+)$/)
  if (urlMatch) {
    const [, username, password, rest] = urlMatch
    if (password.includes('@') && !password.includes('%40')) {
      const encodedPassword = password.replace(/@/g, '%40')
      connectionString = `postgresql://${username}:${encodedPassword}@${rest}`
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
    console.log('Seeding Wabot message templates...')
    
    // Get existing settings
    const result = await pool.query('SELECT id FROM settings LIMIT 1')
    
    const approvalTemplate = `Hello {visitorName},

Your visit request to {residentName} on {visitDate} at {visitTime} has been approved.

Please present the QR code at the entrance for verification.`

    const rejectionTemplate = `Hello {visitorName},

We regret to inform you that your visit request to {residentName} on {visitDate} at {visitTime} has been rejected.

Please contact us for more information.

Thank you.`

    if (result.rows.length > 0) {
      // Update existing settings
      await pool.query(`
        UPDATE settings 
        SET 
          visitor_approval_message_template = COALESCE(visitor_approval_message_template, $1),
          visitor_rejection_message_template = COALESCE(visitor_rejection_message_template, $2),
          wabot_api_base_url = COALESCE(wabot_api_base_url, 'https://app.wabot.my/api'),
          updated_at = NOW()
        WHERE id = $3
      `, [approvalTemplate, rejectionTemplate, result.rows[0].id])
      console.log('✓ Updated message templates in existing settings')
    } else {
      // Create new settings with templates
      await pool.query(`
        INSERT INTO settings (
          property_name,
          address,
          contact_email,
          contact_phone,
          enable_email_notifications,
          enable_sms_notifications,
          billing_reminder_days,
          visitor_approval_notification,
          billing_generation_enabled,
          billing_generation_hour,
          billing_generation_minute,
          wabot_api_base_url,
          visitor_approval_message_template,
          visitor_rejection_message_template
        ) VALUES (
          'Sukha Senior Resort',
          '',
          '',
          '',
          true,
          false,
          7,
          true,
          true,
          2,
          0,
          'https://app.wabot.my/api',
          $1,
          $2
        )
      `, [approvalTemplate, rejectionTemplate])
      console.log('✓ Created settings with message templates')
    }
    
    console.log('Message templates seeded successfully!')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Error seeding message templates:', error)
    await pool.end()
    process.exit(1)
  }
}

seedTemplates()

