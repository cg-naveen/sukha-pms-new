import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { companionBookings } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { eq } from 'drizzle-orm'

const VALID_STATUSES = ['pending', 'confirmed', 'paid', 'cancelled', 'completed']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const [booking] = await db.select().from(companionBookings)
      .where(eq(companionBookings.id, parseInt(id)))

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const [updated] = await db.update(companionBookings)
      .set({ status, updated_at: new Date() })
      .where(eq(companionBookings.id, parseInt(id)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}
