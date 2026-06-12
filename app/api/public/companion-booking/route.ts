import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { companionBookings, insertCompanionBookingSchema } from '../../../../shared/schema'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = insertCompanionBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400, headers: corsHeaders }
      )
    }

    const [booking] = await db
      .insert(companionBookings)
      .values(parsed.data as typeof companionBookings.$inferInsert)
      .returning({ id: companionBookings.id })

    return NextResponse.json(
      { id: booking.id, message: 'Booking request received' },
      { status: 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Companion booking error:', error)
    return NextResponse.json(
      { error: 'Failed to submit booking request', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
