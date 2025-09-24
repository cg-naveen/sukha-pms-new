import { NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { users } from '../../../shared/schema'

export async function GET() {
  try {
    // Simple DB sanity check
    await db.select().from(users).limit(1)
    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('Health DB error:', err)
    return NextResponse.json({ status: 'db_error', error: String(err?.message ?? err) }, { status: 500 })
  }
}


