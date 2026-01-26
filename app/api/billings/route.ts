import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { billings, residents, rooms, occupancy } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { insertBillingSchema } from '../../../shared/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const residentId = searchParams.get('residentId')
    
    const conditions = []
    
    if (status && status !== 'all_statuses') {
      conditions.push(eq(billings.status, status as any))
    }
    
    if (residentId) {
      conditions.push(eq(billings.residentId, parseInt(residentId)))
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    
    const allBillings = await db
      .select({
        id: billings.id,
        residentId: billings.residentId,
        occupancyId: billings.occupancyId,
        amount: billings.amount,
        dueDate: billings.dueDate,
        status: billings.status,
        description: billings.description,
        invoiceFile: billings.invoiceFile,
        billingAccount: billings.billingAccount,
        createdAt: billings.createdAt,
        updatedAt: billings.updatedAt,
        resident: {
          id: residents.id,
          fullName: residents.fullName,
          email: residents.email,
          phone: residents.phone,
          roomId: residents.roomId,
        },
        room: {
          id: rooms.id,
          unitNumber: rooms.unitNumber,
          roomType: rooms.roomType,
        }
      })
      .from(billings)
      .leftJoin(residents, eq(billings.residentId, residents.id))
      .leftJoin(rooms, eq(residents.roomId, rooms.id))
      .where(whereClause)
      .orderBy(desc(billings.createdAt))
    
    // Transform the result to nest the related data
    const result = allBillings.map(item => ({
      ...item,
      resident: item.resident ? {
        ...item.resident,
        room: item.room
      } : null,
      room: undefined
    }))
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching billings:', error)
    return NextResponse.json({ error: 'Failed to fetch billings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    
    // Validate with schema
    const validatedData = insertBillingSchema.parse(body)
    
    const newBilling = await db.insert(billings).values(validatedData).returning()
    return NextResponse.json(newBilling[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error creating billing:', error)
    return NextResponse.json({ error: 'Failed to create billing' }, { status: 500 })
  }
}
