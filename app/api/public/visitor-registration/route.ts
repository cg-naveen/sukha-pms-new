import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { visitors } from '../../../../shared/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { 
      fullName, 
      email, 
      phone, 
      nricPassport, 
      visitDate, 
      visitTime, 
      numberOfVisitors,
      purposeOfVisit,
      details,
      residentName,
      roomNumber,
      vehicleNumber
    } = body

    if (!fullName || !email || !phone || !nricPassport || !visitDate || !visitTime || !numberOfVisitors || !purposeOfVisit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create visitor record
    const visitorData = {
      fullName,
      email,
      phone,
      nricPassport,
      visitDate: new Date(visitDate),
      visitTime,
      numberOfVisitors: parseInt(numberOfVisitors),
      purposeOfVisit,
      details: details || purposeOfVisit,
      residentName: residentName || null,
      roomNumber: roomNumber || null,
      vehicleNumber: vehicleNumber || null,
      status: 'pending' as const,
      countryCode: '+60' as const,
      otherPurpose: purposeOfVisit === 'other' ? details : null
    }

    const [newVisitor] = await db.insert(visitors).values(visitorData).returning()

    return NextResponse.json({
      success: true,
      visitor: newVisitor,
      message: 'Visitor registration submitted successfully'
    })

  } catch (error: any) {
    console.error('Visitor registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register visitor', details: error.message },
      { status: 500 }
    )
  }
}
