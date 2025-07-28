import { NextRequest } from 'next/server'
import { requireAuth } from '../../../lib/auth'
import { storage } from '../../../server/storage'

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    // Get dashboard statistics
    const residents = await storage.getAllResidents()
    const rooms = await storage.getAllRooms()
    const upcomingBillings = await storage.getUpcomingBillings(30)
    const visitors = await storage.getAllVisitors('pending')

    const occupiedRooms = rooms.filter((room: any) => room.status === 'occupied')
    const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms.length / rooms.length) * 100) : 0

    const stats = {
      residentCount: residents.length,
      occupancyRate,
      pendingRenewals: upcomingBillings.length,
      visitorRequests: visitors.length,
      recentActivity: [] // TODO: Implement activity tracking
    }

    return Response.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})