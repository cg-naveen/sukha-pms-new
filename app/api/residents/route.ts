import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { residents, occupancy, rooms, insertOccupancySchema } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { insertResidentSchema } from '../../../shared/schema'
import { like, eq, and, count } from 'drizzle-orm'
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

    // Destructure roomId so we can handle occupancy separately
    const { roomId, ...residentData } = validatedData as typeof validatedData & {
      roomId?: number | null
    }

    // Create resident first
    const [newResident] = await db.insert(residents).values({
      ...residentData,
      roomId: roomId ?? null,
    }).returning()

    // If a room is assigned, create an active occupancy record and update room status
    if (roomId) {
      const today = new Date()
      const oneYearLater = new Date(today)
      oneYearLater.setFullYear(today.getFullYear() + 1)

      const occupancyData = insertOccupancySchema.parse({
        roomId,
        residentId: newResident.id,
        startDate: today,
        endDate: oneYearLater,
        active: true,
      })

      // Deactivate any existing active occupancy for that room (safety)
      await db
        .update(occupancy)
        .set({ active: false, updatedAt: new Date() })
        .where(and(eq(occupancy.roomId, roomId), eq(occupancy.active, true)))

      // Create new occupancy
      await db.insert(occupancy).values(occupancyData)

      // Mark room as occupied
      await db
        .update(rooms)
        .set({ status: 'occupied', updatedAt: new Date() })
        .where(eq(rooms.id, roomId))
    }

    return NextResponse.json(newResident, { status: 201 })
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