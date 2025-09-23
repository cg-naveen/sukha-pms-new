import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../db/index'
import { billings } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { eq } from 'drizzle-orm'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    const billingId = parseInt(params.id)

    const [updatedBilling] = await db
      .update(billings)
      .set(body)
      .where(eq(billings.id, billingId))
      .returning()

    if (!updatedBilling) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    return NextResponse.json(updatedBilling)
  } catch (error) {
    console.error('Error updating billing:', error)
    return NextResponse.json({ error: 'Failed to update billing' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const billingId = parseInt(params.id)

    await db.delete(billings).where(eq(billings.id, billingId))

    return NextResponse.json({ message: 'Billing deleted successfully' })
  } catch (error) {
    console.error('Error deleting billing:', error)
    return NextResponse.json({ error: 'Failed to delete billing' }, { status: 500 })
  }
}
