import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { nextOfKin, insertNextOfKinSchema } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
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

    const residentNextOfKin = await db
      .select()
      .from(nextOfKin)
      .where(eq(nextOfKin.residentId, residentId))

    return NextResponse.json(residentNextOfKin)
  } catch (error) {
    console.error('Error fetching next of kin:', error)
    return NextResponse.json({ error: 'Failed to fetch next of kin' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    const resolvedParams = await params
    const residentId = parseInt(resolvedParams.id)

    console.log('Creating next of kin for resident:', residentId, 'with data:', body)

    // Validate with schema
    const validatedData = insertNextOfKinSchema.parse({ ...body, residentId })

    const newNextOfKin = await db
      .insert(nextOfKin)
      .values(validatedData)
      .returning()

    console.log('Next of kin created successfully:', newNextOfKin[0])
    return NextResponse.json(newNextOfKin[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error creating next of kin:', error.errors)
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error creating next of kin:', error)
    return NextResponse.json({ error: 'Failed to create next of kin' }, { status: 500 })
  }
}
