import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { residents, nextOfKin, occupancy, rooms, billings, insertOccupancySchema } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { insertResidentSchema } from '../../../../shared/schema'
import { eq, and, count } from 'drizzle-orm'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const residentId = parseInt(resolvedParams.id)

    const [resident] = await db
      .select()
      .from(residents)
      .where(eq(residents.id, residentId))

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 })
    }

    // Fetch next of kin for this resident
    const nextOfKinList = await db
      .select()
      .from(nextOfKin)
      .where(eq(nextOfKin.residentId, residentId))

    // Return resident with next of kin
    return NextResponse.json({
      ...resident,
      nextOfKin: nextOfKinList
    })
  } catch (error) {
    console.error('Error fetching resident:', error)
    return NextResponse.json({ error: 'Failed to fetch resident' }, { status: 500 })
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
    const residentId = parseInt(resolvedParams.id)

    // Validate with schema (partial update allowed)
    const validatedData = insertResidentSchema.partial().parse(body)

    // Pull roomId out so we can manage occupancy & room status
    const { roomId, ...residentData } = validatedData as typeof validatedData & {
      roomId?: number | null
    }

    const [updatedResident] = await db
      .update(residents)
      .set({ ...residentData, roomId: roomId ?? null, updatedAt: new Date() })
      .where(eq(residents.id, residentId))
      .returning()

    if (!updatedResident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 })
    }

    // === Occupancy & room status handling ===
    // Fetch any current active occupancy for this resident
    const [currentOccupancy] = await db
      .select()
      .from(occupancy)
      .where(and(eq(occupancy.residentId, residentId), eq(occupancy.active, true)))

    const oldRoomId = currentOccupancy?.roomId as number | undefined
    const newRoomId = roomId ?? null

    // Helper to update room status based on active occupancies
    const updateRoomStatus = async (roomIdToCheck: number) => {
      const [activeCountResult] = await db
        .select({ count: count() })
        .from(occupancy)
        .where(and(eq(occupancy.roomId, roomIdToCheck), eq(occupancy.active, true)))

      const activeCount = Number(activeCountResult?.count || 0)
      const newStatus = activeCount > 0 ? 'occupied' : 'vacant'

      await db
        .update(rooms)
        .set({ status: newStatus as any, updatedAt: new Date() })
        .where(eq(rooms.id, roomIdToCheck))
    }

    // Case 1: Room cleared (newRoomId is null)
    if (!newRoomId && currentOccupancy) {
      await db
        .update(occupancy)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(occupancy.id, currentOccupancy.id))

      await updateRoomStatus(currentOccupancy.roomId)
    }

    // Case 2: Room changed or newly assigned
    if (newRoomId && newRoomId !== oldRoomId) {
      // Deactivate any current active occupancy for this resident
      if (currentOccupancy) {
        await db
          .update(occupancy)
          .set({ active: false, updatedAt: new Date() })
          .where(eq(occupancy.id, currentOccupancy.id))

        await updateRoomStatus(currentOccupancy.roomId)
      }

      const today = new Date()
      const oneYearLater = new Date(today)
      oneYearLater.setFullYear(today.getFullYear() + 1)

      // Convert dates to YYYY-MM-DD string format for the schema
      const startDateString = today.toISOString().split('T')[0]
      const endDateString = oneYearLater.toISOString().split('T')[0]

      const occupancyData = insertOccupancySchema.parse({
        roomId: newRoomId,
        residentId: residentId,
        startDate: startDateString,
        endDate: endDateString,
        active: true,
      })

      await db.insert(occupancy).values(occupancyData)
      await updateRoomStatus(newRoomId)
    }

    return NextResponse.json(updatedResident)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error updating resident:', error)
    return NextResponse.json({ error: 'Failed to update resident' }, { status: 500 })
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
    const residentId = parseInt(resolvedParams.id)

    // Delete related records in order of dependencies
    // 1. Delete billings first (depends on resident)
    await db.delete(billings).where(eq(billings.residentId, residentId))

    // 2. Delete next of kin records
    await db.delete(nextOfKin).where(eq(nextOfKin.residentId, residentId))

    // 3. Delete occupancy records and update room status
    const occupancyRecords = await db
      .select()
      .from(occupancy)
      .where(eq(occupancy.residentId, residentId))

    for (const occ of occupancyRecords) {
      await db.delete(occupancy).where(eq(occupancy.id, occ.id))
      
      // Update room status to vacant if no active occupancy
      const [activeCountResult] = await db
        .select({ count: count() })
        .from(occupancy)
        .where(and(eq(occupancy.roomId, occ.roomId), eq(occupancy.active, true)))
      
      const activeCount = Number(activeCountResult?.count || 0)
      if (activeCount === 0) {
        await db
          .update(rooms)
          .set({ status: 'vacant', updatedAt: new Date() })
          .where(eq(rooms.id, occ.roomId))
      }
    }

    // 4. Finally delete the resident
    await db.delete(residents).where(eq(residents.id, residentId))

    return NextResponse.json({ message: 'Resident deleted successfully' })
  } catch (error) {
    console.error('Error deleting resident:', error)
    return NextResponse.json({ error: 'Failed to delete resident' }, { status: 500 })
  }
}
