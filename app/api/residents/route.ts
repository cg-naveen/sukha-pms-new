import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { residents } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { like } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    
    let query = db.select().from(residents)
    
    if (search) {
      query = query.where(like(residents.fullName, `%${search}%`))
    }
    
    const allResidents = await query
    return NextResponse.json(allResidents)
  } catch (error) {
    console.error('Error fetching residents:', error)
    return NextResponse.json({ error: 'Failed to fetch residents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    const newResident = await db.insert(residents).values(body).returning()
    return NextResponse.json(newResident[0], { status: 201 })
  } catch (error) {
    console.error('Error creating resident:', error)
    return NextResponse.json({ error: 'Failed to create resident' }, { status: 500 })
  }
}