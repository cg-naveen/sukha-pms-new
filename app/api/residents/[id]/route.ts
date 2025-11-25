import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { residents, nextOfKin } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { insertResidentSchema } from '../../../../shared/schema'
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
    const residentId = parseInt(resolvedParams.id)

    const [resident] = await db
      .select()
      .from(residents)
      .where(eq(residents.id, residentId))

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 })
    }

    // Fetch next of kin for this resident
    const nextOfKinList = await db
      .select()
      .from(nextOfKin)
      .where(eq(nextOfKin.residentId, residentId))

    // Return resident with next of kin
    return NextResponse.json({
      ...resident,
      nextOfKin: nextOfKinList
    })
  } catch (error) {
    console.error('Error fetching resident:', error)
    return NextResponse.json({ error: 'Failed to fetch resident' }, { status: 500 })
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
    const residentId = parseInt(resolvedParams.id)

    // Validate with schema (partial update allowed)
    const validatedData = insertResidentSchema.partial().parse(body)

    const [updatedResident] = await db
      .update(residents)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(residents.id, residentId))
      .returning()

    if (!updatedResident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 })
    }

    return NextResponse.json(updatedResident)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error updating resident:', error)
    return NextResponse.json({ error: 'Failed to update resident' }, { status: 500 })
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
    const residentId = parseInt(resolvedParams.id)

    await db.delete(residents).where(eq(residents.id, residentId))

    return NextResponse.json({ message: 'Resident deleted successfully' })
  } catch (error) {
    console.error('Error deleting resident:', error)
    return NextResponse.json({ error: 'Failed to delete resident' }, { status: 500 })
  }
}
