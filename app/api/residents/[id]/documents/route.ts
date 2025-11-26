import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { documents } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const residentId = parseInt(resolvedParams.id)

    const residentDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.residentId, residentId))
      .orderBy(documents.createdAt)

    return NextResponse.json(residentDocuments)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

