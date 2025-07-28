import { NextRequest } from 'next/server'
import { requireAuth } from '../../../../lib/auth'
import { storage } from '../../../../server/storage'

export const GET = requireAuth(async (request: NextRequest, user: any, { params }: { params: { days: string } }) => {
  try {
    const days = parseInt(params.days) || 30
    const billings = await storage.getUpcomingBillings(days)
    return Response.json(billings)
  } catch (error) {
    console.error('Get upcoming billings error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})