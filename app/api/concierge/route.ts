import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { companionBookings } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { desc, eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let bookings
    if (status && status !== 'all') {
      bookings = await db.select().from(companionBookings)
        .where(eq(companionBookings.status, status))
        .orderBy(desc(companionBookings.created_at))
    } else {
      bookings = await db.select().from(companionBookings)
        .orderBy(desc(companionBookings.created_at))
    }

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching concierge bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
