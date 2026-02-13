import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set')
  console.error('Please set DATABASE_URL in your environment or .env file')
  process.exit(1)
}

async function migrate() {
  let connectionString = process.env.DATABASE_URL!

  if (connectionString.includes('sslcert=disable')) {
    connectionString = connectionString
      .replace('&sslcert=disable', '')
      .replace('sslcert=disable&', '')
      .replace('?sslcert=disable', '?')
      .replace('&sslcert=disable', '')
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    console.log('Starting migration: room slots + remark + not_in_use status...')

    await pool.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS slot_label TEXT NOT NULL DEFAULT '';
    `)
    console.log('✓ Added slot_label column')

    await pool.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS remark TEXT;
    `)
    console.log('✓ Added remark column')

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'rooms_unit_number_unique'
        ) THEN
          RETURN;
        END IF;

        ALTER TABLE rooms DROP CONSTRAINT rooms_unit_number_unique;
      END
      $$;
    `)

    await pool.query(`DROP INDEX IF EXISTS rooms_unit_number_unique;`)
    console.log('✓ Removed unique constraint/index on unit_number')

    await pool.query(`
      UPDATE rooms
      SET
        slot_label = UPPER(SUBSTRING(TRIM(unit_number) FROM '([A-Za-z])$')),
        unit_number = TRIM(REGEXP_REPLACE(unit_number, '\\s*[A-Za-z]$', ''))
      WHERE slot_label = ''
        AND TRIM(unit_number) ~* '[A-Za-z]$';
    `)
    console.log('✓ Split existing unit suffix into slot_label')

    await pool.query(`
      ALTER TABLE rooms
      DROP CONSTRAINT IF EXISTS rooms_unit_slot_unq;
    `)

    await pool.query(`
      ALTER TABLE rooms
      ADD CONSTRAINT rooms_unit_slot_unq UNIQUE (unit_number, slot_label);
    `)
    console.log('✓ Added unique constraint on (unit_number, slot_label)')

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'room_status'
            AND e.enumlabel = 'not_in_use'
        ) THEN
          ALTER TYPE room_status ADD VALUE 'not_in_use';
        END IF;
      END
      $$;
    `)
    console.log('✓ Added not_in_use to room_status enum')

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
