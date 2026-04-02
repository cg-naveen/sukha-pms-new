import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { visitors, insertVisitorSchema } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { z } from 'zod'

/**
 * Walk-in registration: creates a visitor already approved with a QR code.
 * Lives at /api/visitors/walk-in so it is not swallowed by /api/visitors/[id] (id === "walk-in" caused POST 405).
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  const user = authResult as { id: number }

  try {
    const body = await request.json()
    const visitorData = insertVisitorSchema.parse(body)
    const qrCode = crypto.randomUUID()

    const [newVisitor] = await db
      .insert(visitors)
      .values({
        ...visitorData,
        status: 'approved',
        qrCode,
        approvedById: user.id,
        approvedAt: new Date(),
      })
      .returning()

    return NextResponse.json(
      {
        message: 'Walk-in visitor registered and approved successfully',
        visitor: newVisitor,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 })
    }
    console.error('Error creating walk-in visitor:', error)
    return NextResponse.json({ message: 'Failed to register walk-in visitor' }, { status: 500 })
  }
}
