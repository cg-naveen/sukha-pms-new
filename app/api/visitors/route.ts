import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { visitors } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { and, desc, eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Base query: newest first
    let query = db.select().from(visitors).orderBy(desc(visitors.createdAt))

    // Apply status filter only when not "all_statuses"
    if (status && status !== 'all_statuses') {
      query = query.where(eq(visitors.status, status as any))
    }

    const allVisitors = await query
    return NextResponse.json(allVisitors)
  } catch (error) {
    console.error('Error fetching visitors:', error)
    return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    const newVisitor = await db.insert(visitors).values(body).returning()
    return NextResponse.json(newVisitor[0], { status: 201 })
  } catch (error) {
    console.error('Error creating visitor:', error)
    return NextResponse.json({ error: 'Failed to create visitor' }, { status: 500 })
  }
}
