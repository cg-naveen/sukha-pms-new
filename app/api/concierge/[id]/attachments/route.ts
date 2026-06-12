import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { companionBookingAttachments } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { eq, desc } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const attachments = await db.select().from(companionBookingAttachments)
      .where(eq(companionBookingAttachments.booking_id, parseInt(id)))
      .orderBy(desc(companionBookingAttachments.created_at))

    return NextResponse.json(attachments)
  } catch (error) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 })
  }
}
