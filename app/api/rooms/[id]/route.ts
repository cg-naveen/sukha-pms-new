import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { rooms } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { insertRoomSchema } from '../../../../shared/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const roomId = parseInt(resolvedParams.id)

    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    return NextResponse.json(room)
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    const resolvedParams = await params
    const roomId = parseInt(resolvedParams.id)

    // Validate with schema (partial update allowed)
    const validatedData = insertRoomSchema.partial().parse(body)

    const [updatedRoom] = await db
      .update(rooms)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(rooms.id, roomId))
      .returning()

    if (!updatedRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    return NextResponse.json(updatedRoom)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error updating room:', error)
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin'])()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const roomId = parseInt(resolvedParams.id)

    await db.delete(rooms).where(eq(rooms.id, roomId))

    return NextResponse.json({ message: 'Room deleted successfully' })
  } catch (error) {
    console.error('Error deleting room:', error)
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 })
  }
}

