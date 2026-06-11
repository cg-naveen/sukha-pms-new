import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { companionBookings, insertCompanionBookingSchema } from '../../../../shared/schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = insertCompanionBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const [booking] = await db
      .insert(companionBookings)
      .values(parsed.data)
      .returning({ id: companionBookings.id })

    return NextResponse.json(
      { id: booking.id, message: 'Booking request received' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Companion booking error:', error)
    return NextResponse.json(
      { error: 'Failed to submit booking request', details: error.message },
      { status: 500 }
    )
  }
}
