import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { visitors } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { insertVisitorSchema } from '../../../../shared/schema'
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
    const visitorId = parseInt(resolvedParams.id)

    const [visitor] = await db
      .select()
      .from(visitors)
      .where(eq(visitors.id, visitorId))

    if (!visitor) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 })
    }

    return NextResponse.json(visitor)
  } catch (error) {
    console.error('Error fetching visitor:', error)
    return NextResponse.json({ error: 'Failed to fetch visitor' }, { status: 500 })
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
    const visitorId = parseInt(resolvedParams.id)

    // Validate with schema (partial update allowed, excluding system fields)
    const validatedData = insertVisitorSchema.partial().parse(body)

    const [updatedVisitor] = await db
      .update(visitors)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(visitors.id, visitorId))
      .returning()

    if (!updatedVisitor) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 })
    }

    return NextResponse.json(updatedVisitor)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error updating visitor:', error)
    return NextResponse.json({ error: 'Failed to update visitor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin'])()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const visitorId = parseInt(resolvedParams.id)

    await db.delete(visitors).where(eq(visitors.id, visitorId))

    return NextResponse.json({ message: 'Visitor deleted successfully' })
  } catch (error) {
    console.error('Error deleting visitor:', error)
    return NextResponse.json({ error: 'Failed to delete visitor' }, { status: 500 })
  }
}

