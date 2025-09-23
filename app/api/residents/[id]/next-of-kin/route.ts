import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../db/index'
import { nextOfKin } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const residentId = parseInt(params.id)

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
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    const residentId = parseInt(params.id)

    const newNextOfKin = await db
      .insert(nextOfKin)
      .values({ ...body, residentId })
      .returning()

    return NextResponse.json(newNextOfKin[0], { status: 201 })
  } catch (error) {
    console.error('Error creating next of kin:', error)
    return NextResponse.json({ error: 'Failed to create next of kin' }, { status: 500 })
  }
}
