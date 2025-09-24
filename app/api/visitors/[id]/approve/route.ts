import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { visitors } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { eq } from 'drizzle-orm'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const visitorId = Number(id)

    const qrCode = crypto.randomUUID()

    const [updated] = await db
      .update(visitors)
      .set({ status: 'approved' as any, qrCode, updatedAt: new Date() })
      .where(eq(visitors.id, visitorId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error approving visitor:', error)
    return NextResponse.json({ error: 'Failed to approve visitor' }, { status: 500 })
  }
}
