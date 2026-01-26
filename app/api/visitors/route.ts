import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { visitors, residents, rooms, insertVisitorSchema } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Base query: newest first
    let allVisitors
    
    // Apply status filter only when not "all_statuses"
    if (status && status !== 'all_statuses') {
      allVisitors = await db.select().from(visitors)
        .where(eq(visitors.status, status as any))
        .orderBy(desc(visitors.createdAt))
    } else {
      allVisitors = await db.select().from(visitors)
        .orderBy(desc(visitors.createdAt))
    }

    // Fetch resident and room data for each visitor
    const visitorsWithDetails = await Promise.all(
      allVisitors.map(async (visitor) => {
        let residentInfo: any = null
        if (visitor.residentId) {
          const [resident] = await db.select().from(residents).where(eq(residents.id, visitor.residentId))
          if (resident) {
            residentInfo = resident
            // Get room info if resident has a room
            if (resident.roomId) {
              const [room] = await db.select().from(rooms).where(eq(rooms.id, resident.roomId))
              if (room) {
                residentInfo = { ...residentInfo, room }
              }
            }
          }
        }
        return {
          ...visitor,
          residentFullName: residentInfo?.fullName || visitor.residentName || null,
          residentRoomNumber: residentInfo?.room?.unitNumber || visitor.roomNumber || null,
          purposeOfVisit: visitor.purposeOfVisit || null,
        }
      })
    )

    return NextResponse.json(visitorsWithDetails)
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
    
    // Validate with schema
    const validatedData = insertVisitorSchema.parse(body)
    
    const newVisitor = await db.insert(visitors).values(validatedData).returning()
    return NextResponse.json(newVisitor[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error creating visitor:', error)
    return NextResponse.json({ error: 'Failed to create visitor' }, { status: 500 })
  }
}
