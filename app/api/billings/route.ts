import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { billings } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const residentId = searchParams.get('residentId')
    
    let query = db.select().from(billings)
    
    if (status) {
      query = query.where(eq(billings.status, status as any))
    }
    
    if (residentId) {
      query = query.where(eq(billings.residentId, parseInt(residentId)))
    }
    
    const allBillings = await query
    return NextResponse.json(allBillings)
  } catch (error) {
    console.error('Error fetching billings:', error)
    return NextResponse.json({ error: 'Failed to fetch billings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    const newBilling = await db.insert(billings).values(body).returning()
    return NextResponse.json(newBilling[0], { status: 201 })
  } catch (error) {
    console.error('Error creating billing:', error)
    return NextResponse.json({ error: 'Failed to create billing' }, { status: 500 })
  }
}
