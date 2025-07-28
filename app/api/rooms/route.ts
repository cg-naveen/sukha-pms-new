import { NextRequest } from 'next/server'
import { requireAuth } from '../../lib/auth'
import { storage } from '../../server/storage'
import { insertRoomSchema } from '@shared/schema'

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const type = searchParams.get('type') || undefined
    const status = searchParams.get('status') || undefined

    const rooms = await storage.getAllRooms(search, type, status)
    return Response.json(rooms)
  } catch (error) {
    console.error('Get rooms error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const roomData = insertRoomSchema.parse(body)
    
    const room = await storage.createRoom(roomData)
    return Response.json(room, { status: 201 })
  } catch (error) {
    console.error('Create room error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})