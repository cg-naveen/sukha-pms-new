import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { rooms, occupancy, residents } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { insertRoomSchema } from '../../../shared/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export async function GET() {
  try {
    const allRooms = await db.select().from(rooms)
    
    // For each room, fetch occupancy and resident data
    const roomsWithOccupancy = await Promise.all(
      allRooms.map(async (room) => {
        const occupancyData = await db
          .select({
            id: occupancy.id,
            roomId: occupancy.roomId,
            residentId: occupancy.residentId,
            startDate: occupancy.startDate,
            endDate: occupancy.endDate,
            active: occupancy.active,
            createdAt: occupancy.createdAt,
            updatedAt: occupancy.updatedAt,
            resident: {
              id: residents.id,
              fullName: residents.fullName,
              email: residents.email,
              phone: residents.phone,
              classification: residents.classification,
            }
          })
          .from(occupancy)
          .leftJoin(residents, eq(occupancy.residentId, residents.id))
          .where(eq(occupancy.roomId, room.id))

        return {
          ...room,
          occupancy: occupancyData
        }
      })
    )
    
    return NextResponse.json(roomsWithOccupancy)
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
