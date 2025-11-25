import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { sql } from 'drizzle-orm'
import { requireAuth } from '../../../lib/auth'

export async function POST(request: NextRequest) {
  // Only allow admins to run migrations
  const authResult = await requireAuth(['admin'])()
  if (authResult instanceof Response) return authResult

  try {
    console.log('Starting migration: Adding numberOfBeds to rooms and billingDate to residents...')
    
    // Add numberOfBeds column to rooms table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE rooms 
      ADD COLUMN IF NOT EXISTS number_of_beds INTEGER NOT NULL DEFAULT 1;
    `)
    console.log('✓ Added number_of_beds column to rooms table')
    
    // Add billingDate column to residents table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE residents 
      ADD COLUMN IF NOT EXISTS billing_date INTEGER NOT NULL DEFAULT 1;
    `)
    console.log('✓ Added billing_date column to residents table')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully',
      changes: [
        'Added number_of_beds column to rooms table',
        'Added billing_date column to residents table'
      ]
    })
  } catch (error: any) {
    console.error('Migration failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Migration failed' 
    }, { status: 500 })
  }
}

