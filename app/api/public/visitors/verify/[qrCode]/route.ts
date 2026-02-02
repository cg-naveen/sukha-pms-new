import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../../lib/db'
import { visitors } from '../../../../../../shared/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qrCode } = body

    if (!qrCode) {
      return NextResponse.json(
        {
          success: false,
          message: 'QR code is required'
        },
        { status: 400 }
      )
    }

    // Find visitor with this QR code
    const [visitor] = await db
      .select()
      .from(visitors)
      .where(eq(visitors.qrCode, qrCode))
      .limit(1)

    if (!visitor) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired QR code'
        },
        { status: 404 }
      )
    }

    // Check if visitor is approved
    if (visitor.status !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          message: `Visitor status is ${visitor.status}, not approved`
        },
        { status: 400 }
      )
    }

    // Check if the visit date is valid (not in the past)
    const visitDate = new Date(visitor.visitDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (visitDate < today) {
      return NextResponse.json(
        {
          success: false,
          message: 'This visit has expired',
          visitor: {
            id: visitor.id,
            fullName: visitor.fullName,
            visitDate: visitor.visitDate,
            status: 'expired'
          }
        },
        { status: 400 }
      )
    }

    // Valid QR code for an upcoming or today's visit
    return NextResponse.json(
      {
        success: true,
        message: 'QR code verified successfully',
        visitor: {
          id: visitor.id,
          fullName: visitor.fullName,
          email: visitor.email,
          phone: visitor.phone,
          visitDate: visitor.visitDate,
          visitTime: visitor.visitTime,
          purposeOfVisit: visitor.purposeOfVisit,
          residentName: visitor.residentName,
          roomNumber: visitor.roomNumber,
          numberOfVisitors: visitor.numberOfVisitors,
          status: visitor.status
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error verifying QR code:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to verify QR code'
      },
      { status: 500 }
    )
  }
}
