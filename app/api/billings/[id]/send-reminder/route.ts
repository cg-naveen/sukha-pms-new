import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../db/index'
import { billings, residents } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { eq } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const billingId = parseInt(resolvedParams.id)

    // Get billing details with resident information
    const [billing] = await db
      .select({
        id: billings.id,
        amount: billings.amount,
        dueDate: billings.dueDate,
        status: billings.status,
        residentId: billings.residentId,
        residentName: residents.fullName,
        residentEmail: residents.email,
      })
      .from(billings)
      .leftJoin(residents, eq(billings.residentId, residents.id))
      .where(eq(billings.id, billingId))

    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    // In a real application, you would send an actual email here
    // For now, we'll just simulate the reminder being sent
    console.log(`Sending payment reminder to ${billing.residentName} (${billing.residentEmail})`)
    console.log(`Billing ID: ${billing.id}, Amount: ${billing.amount}, Due Date: ${billing.dueDate}`)

    // Optionally update the billing record to track that a reminder was sent
    await db
      .update(billings)
      .set({ 
        updatedAt: new Date(),
        // You could add a lastReminderSent field to track this
      })
      .where(eq(billings.id, billingId))

    return NextResponse.json({
      message: 'Payment reminder sent successfully',
      billingId: billing.id,
      recipientName: billing.residentName,
      recipientEmail: billing.residentEmail
    })
  } catch (error) {
    console.error('Error sending reminder:', error)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}
