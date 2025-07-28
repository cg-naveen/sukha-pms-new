import { NextRequest } from 'next/server'
import { requireAuth } from '../../lib/auth'
import { storage } from '../../server/storage'
import { insertResidentSchema } from '@shared/schema'

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const roomType = searchParams.get('roomType') || undefined
    const status = searchParams.get('status') || undefined

    const residents = await storage.getAllResidents(search, roomType, status)
    return Response.json(residents)
  } catch (error) {
    console.error('Get residents error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { resident: residentData, nextOfKin } = body
    const validatedResident = insertResidentSchema.parse(residentData)
    
    const resident = await storage.createResident(validatedResident, nextOfKin)
    return Response.json(resident, { status: 201 })
  } catch (error) {
    console.error('Create resident error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
})