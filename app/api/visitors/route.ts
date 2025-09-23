import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { visitors } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    let query = db.select().from(visitors)
    
    if (status) {
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
