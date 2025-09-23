import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/shared/schema'

export async function GET() {
  try {
    // Simple DB sanity check
    const count = await db.select({ c: db.fn.count(users.id) }).from(users)
    return NextResponse.json({ status: 'ok', users: count?.[0]?.c ?? 0 })
  } catch (err: any) {
    console.error('Health DB error:', err)
    return NextResponse.json({ status: 'db_error', error: String(err?.message ?? err) }, { status: 500 })
  }
}


