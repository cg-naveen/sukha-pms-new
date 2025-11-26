import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { billings } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { insertBillingSchema } from '../../../../shared/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const billingId = parseInt(resolvedParams.id)

    const [billing] = await db
      .select()
      .from(billings)
      .where(eq(billings.id, billingId))

    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    return NextResponse.json(billing)
  } catch (error) {
    console.error('Error fetching billing:', error)
    return NextResponse.json({ error: 'Failed to fetch billing' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    const resolvedParams = await params
    const billingId = parseInt(resolvedParams.id)

    // Validate with schema (partial update allowed)
    const validatedData = insertBillingSchema.partial().parse(body)

    const [updatedBilling] = await db
      .update(billings)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(billings.id, billingId))
      .returning()

    if (!updatedBilling) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    return NextResponse.json(updatedBilling)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error updating billing:', error)
    return NextResponse.json({ error: 'Failed to update billing' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const billingId = parseInt(resolvedParams.id)

    await db.delete(billings).where(eq(billings.id, billingId))

    return NextResponse.json({ message: 'Billing deleted successfully' })
  } catch (error) {
    console.error('Error deleting billing:', error)
    return NextResponse.json({ error: 'Failed to delete billing' }, { status: 500 })
  }
}
