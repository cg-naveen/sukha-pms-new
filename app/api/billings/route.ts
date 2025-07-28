import { NextRequest } from 'next/server'
import { requireAuth } from '../../lib/auth'
import { storage } from '../../server/storage'

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const billings = await storage.getAllBillings(status)
    return Response.json(billings)
  } catch (error) {
    console.error('Get billings error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})