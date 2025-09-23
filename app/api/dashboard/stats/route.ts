import { NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { residents, rooms, billings, visitors } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { eq, count } from 'drizzle-orm'

export async function GET() {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    // Get total residents count
    const [residentCountResult] = await db.select({ count: count() }).from(residents)
    const residentCount = residentCountResult.count

    // Get room occupancy rate
    const [totalRoomsResult] = await db.select({ count: count() }).from(rooms)
    const totalRooms = totalRoomsResult.count
    
    const [occupiedRoomsResult] = await db.select({ count: count() }).from(rooms).where(eq(rooms.status, 'occupied'))
    const occupiedRooms = occupiedRoomsResult.count
    
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

    // Get pending billings count
    const [pendingBillingsResult] = await db.select({ count: count() }).from(billings).where(eq(billings.status, 'pending'))
    const pendingBillings = pendingBillingsResult.count

    // Get pending visitors count
    const [pendingVisitorsResult] = await db.select({ count: count() }).from(visitors).where(eq(visitors.status, 'pending'))
    const pendingVisitors = pendingVisitorsResult.count

    return NextResponse.json({
      residentCount,
      occupancyRate,
      pendingBillings,
      pendingVisitors,
      totalRooms,
      occupiedRooms
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
