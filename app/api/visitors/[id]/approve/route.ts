import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { visitors, settings } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { eq } from 'drizzle-orm'
import { sendWabotMessage, replaceTemplateVariables } from '../../../../../lib/wabot'
import { format } from 'date-fns'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const visitorId = Number(id)

    // Get visitor details first
    const [visitor] = await db
      .select()
      .from(visitors)
      .where(eq(visitors.id, visitorId))
      .limit(1)

    if (!visitor) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 })
    }

    const qrCode = crypto.randomUUID()

    const [updated] = await db
      .update(visitors)
      .set({ status: 'approved' as any, qrCode, updatedAt: new Date() })
      .where(eq(visitors.id, visitorId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 })
    }

    // Send WhatsApp notification if configured
    try {
      // Get settings for Wabot configuration and message template
      const [settingsData] = await db
        .select()
        .from(settings)
        .limit(1)

      if (settingsData?.visitorApprovalMessageTemplate && settingsData.wabotApiBaseUrl) {
        // Generate QR code URL for verification
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000'
        const qrCodeUrl = `${baseUrl}/api/public/visitors/verify/${qrCode}`

        // Replace template variables
        const message = replaceTemplateVariables(
          settingsData.visitorApprovalMessageTemplate,
          {
            visitorName: updated.fullName || 'Visitor',
            residentName: updated.residentName || 'Resident',
            visitDate: updated.visitDate ? format(new Date(updated.visitDate), 'dd MMM yyyy') : 'N/A',
            visitTime: updated.visitTime || 'N/A',
            qrCodeUrl: qrCodeUrl,
          }
        )

        // Send WhatsApp message
        const wabotResult = await sendWabotMessage(
          updated.phone,
          message,
          settingsData.wabotApiBaseUrl
        )

        if (!wabotResult.success) {
          console.error('Failed to send WhatsApp approval notification:', wabotResult.error)
          // Don't fail the approval if WhatsApp fails
        } else {
          console.log('WhatsApp approval notification sent successfully')
        }
      }
    } catch (whatsappError) {
      console.error('Error sending WhatsApp notification:', whatsappError)
      // Don't fail the approval if WhatsApp fails
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error approving visitor:', error)
    return NextResponse.json({ error: 'Failed to approve visitor' }, { status: 500 })
  }
}
