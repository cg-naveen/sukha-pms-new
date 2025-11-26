import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { rooms } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { insertRoomSchema } from '../../../shared/schema'
import { z } from 'zod'

export async function GET() {
  try {
    const allRooms = await db.select().from(rooms)
    return NextResponse.json(allRooms)
  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    
    // Validate with schema
    const validatedData = insertRoomSchema.parse(body)
    
    const newRoom = await db.insert(rooms).values(validatedData).returning()
    return NextResponse.json(newRoom[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error creating room:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}
