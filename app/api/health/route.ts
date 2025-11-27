import { NextResponse } from 'next/server'
import { db, testConnection } from '../../../lib/db'
import { users } from '../../../shared/schema'

export async function GET() {
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown'
  }

  // Check environment variables
  const envCheck: any = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY
  }
  health.env = envCheck

  // Test database connection
  try {
    const connectionTest = await testConnection()
    if (connectionTest.success) {
      // Try a simple query
      await db.select().from(users).limit(1)
      health.database = { status: 'connected', query: 'success' }
    } else {
      health.database = { 
        status: 'error', 
        error: connectionTest.error,
        code: connectionTest.code,
        diagnostic: connectionTest.diagnostic
      }
      health.status = 'error'
      
      // Add connection string format hint (without exposing password)
      if (process.env.DATABASE_URL) {
        try {
          const url = new URL(process.env.DATABASE_URL)
          health.database.hostname = url.hostname
          // Check for common incorrect hostname pattern
          if (url.hostname.includes('db.') && url.hostname.includes('.supabase.co') && !url.hostname.includes('pooler')) {
            health.database.diagnostic = '⚠️ Incorrect hostname format detected. Supabase connection strings should use pooler.supabase.com, not db.[project].supabase.co. Get the correct connection string from Supabase dashboard: Settings → Database → Connection string'
          }
        } catch {
          // Invalid URL format
        }
      }
    }
  } catch (err: any) {
    console.error('Health DB error:', err)
    health.database = { 
      status: 'error', 
      error: err?.message || String(err),
      code: err?.code
    }
    health.status = 'error'
  }

  const statusCode = health.status === 'ok' ? 200 : 500
  return NextResponse.json(health, { status: statusCode })
}


