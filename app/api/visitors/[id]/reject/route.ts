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

    const [updated] = await db
      .update(visitors)
      .set({ status: 'rejected' as any, updatedAt: new Date() })
      .where(eq(visitors.id, visitorId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 })
    }

    // Send WhatsApp notification if configured and enabled
    try {
      // Get settings for Wabot configuration and message template
      const [settingsData] = await db
        .select()
        .from(settings)
        .limit(1)

      if (settingsData?.wabotEnabled && settingsData?.visitorRejectionMessageTemplate && settingsData.wabotApiBaseUrl) {
        // Replace template variables
        const message = replaceTemplateVariables(
          settingsData.visitorRejectionMessageTemplate,
          {
            visitorName: updated.fullName || 'Visitor',
            residentName: updated.residentName || 'Resident',
            visitDate: updated.visitDate ? format(new Date(updated.visitDate), 'dd MMM yyyy') : 'N/A',
            visitTime: updated.visitTime || 'N/A',
          }
        )

        // Send WhatsApp message
        const wabotResult = await sendWabotMessage(
          updated.phone,
          message,
          settingsData.wabotApiBaseUrl
        )

        if (!wabotResult.success) {
          console.error('Failed to send WhatsApp rejection notification:', wabotResult.error)
          // Don't fail the rejection if WhatsApp fails
        } else {
          console.log('WhatsApp rejection notification sent successfully')
        }
      }
    } catch (whatsappError) {
      console.error('Error sending WhatsApp notification:', whatsappError)
      // Don't fail the rejection if WhatsApp fails
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error rejecting visitor:', error)
    return NextResponse.json({ error: 'Failed to reject visitor' }, { status: 500 })
  }
}
