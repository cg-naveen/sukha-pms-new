import { NextRequest } from 'next/server'
import { requireAuth } from '../../lib/auth'
import { storage } from '../../server/storage'
import { insertVisitorSchema } from '@shared/schema'

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const visitors = await storage.getAllVisitors(status)
    return Response.json(visitors)
  } catch (error) {
    console.error('Get visitors error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const visitorData = insertVisitorSchema.parse(body)
    
    const visitor = await storage.createVisitor(visitorData)
    return Response.json(visitor, { status: 201 })
  } catch (error) {
    console.error('Create visitor error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})