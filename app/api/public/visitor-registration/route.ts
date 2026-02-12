import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { visitors, settings } from '../../../../shared/schema'
import { eq } from 'drizzle-orm'
import { sendWabotMessage, replaceTemplateVariables } from '../../../../lib/wabot'
import { format } from 'date-fns'

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
      vehicleNumber,
      countryCode
    } = body

    if (!fullName || !email || !phone || !nricPassport || !visitDate || !visitTime || !numberOfVisitors || !purposeOfVisit || !residentName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if auto-approval is enabled
    const [settingsData] = await db
      .select()
      .from(settings)
      .limit(1)

    const autoApproval = settingsData?.visitorAutoApproval ?? false

    // Create visitor record
    const visitorData = {
      fullName,
      email,
      phone,
      nricPassport,
      visitDate: visitDate, // Keep as string (YYYY-MM-DD format)
      visitTime,
      numberOfVisitors: parseInt(numberOfVisitors),
      purposeOfVisit,
      details: details || purposeOfVisit,
      residentName: residentName || null,
      roomNumber: roomNumber || null,
      vehicleNumber: vehicleNumber || null,
      status: autoApproval ? 'approved' as const : 'pending' as const,
      countryCode: (countryCode || '+60') as '+60',
      otherPurpose: purposeOfVisit === 'other' ? details : null
    }

    const [newVisitor] = await db.insert(visitors).values(visitorData).returning()

    // If auto-approved and wabot is enabled, send WhatsApp notification
    if (autoApproval && settingsData?.wabotEnabled && settingsData?.visitorApprovalMessageTemplate && settingsData.wabotApiBaseUrl) {
      try {
        const textMessage = replaceTemplateVariables(
          settingsData.visitorApprovalMessageTemplate,
          {
            visitorName: newVisitor.fullName || 'Visitor',
            residentName: newVisitor.residentName || 'Resident',
            visitDate: newVisitor.visitDate ? format(new Date(newVisitor.visitDate), 'dd MMM yyyy') : 'N/A',
            visitTime: newVisitor.visitTime || 'N/A',
          }
        )

        const result = await sendWabotMessage(
          newVisitor.phone,
          textMessage,
          settingsData.wabotApiBaseUrl
        )

        if (!result.success) {
          console.error('Failed to send WhatsApp notification on auto-approval:', result.error)
        } else {
          console.log('WhatsApp notification sent on auto-approval for visitor:', newVisitor.id)
        }
      } catch (whatsappError) {
        console.error('Error sending WhatsApp notification on auto-approval:', whatsappError)
        // Don't fail the registration if WhatsApp fails
      }
    }

    return NextResponse.json({
      success: true,
      visitor: newVisitor,
      message: autoApproval 
        ? 'Visitor registration approved automatically' 
        : 'Visitor registration submitted successfully'
    })

  } catch (error: any) {
    console.error('Visitor registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register visitor', details: error.message },
      { status: 500 }
    )
  }
}
