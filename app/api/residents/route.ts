import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { residents } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { insertResidentSchema } from '../../../shared/schema'
import { like } from 'drizzle-orm'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    
    if (search) {
      const allResidents = await db.select().from(residents).where(like(residents.fullName, `%${search}%`))
      return NextResponse.json(allResidents)
    }
    
    const allResidents = await db.select().from(residents)
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
    
    // Validate with schema
    const validatedData = insertResidentSchema.parse(body)
    
    const newResident = await db.insert(residents).values(validatedData).returning()
    return NextResponse.json(newResident[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error creating resident:', error)
    return NextResponse.json({ error: 'Failed to create resident' }, { status: 500 })
  }
}