import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { occupancy } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const roomId = parseInt(resolvedParams.id)

    // Get count of active occupancies for this room
    const activeOccupancies = await db
      .select()
      .from(occupancy)
      .where(
        and(
          eq(occupancy.roomId, roomId),
          eq(occupancy.active, true)
        )
      )

    return NextResponse.json({
      roomId,
      activeOccupancyCount: activeOccupancies.length,
      occupancies: activeOccupancies
    })
  } catch (error) {
    console.error('Error fetching room occupancy:', error)
    return NextResponse.json({ error: 'Failed to fetch room occupancy' }, { status: 500 })
  }
}

