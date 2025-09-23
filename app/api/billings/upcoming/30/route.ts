import { NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { billings } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { and, gte, lte } from 'drizzle-orm'

export async function GET() {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    // Get current date and 30 days from now
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    // Format dates for SQL
    const todayStr = today.toISOString().split('T')[0]
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0]

    // Get billings due in the next 30 days
    const upcomingBillings = await db.select().from(billings).where(
      and(
        gte(billings.dueDate, todayStr),
        lte(billings.dueDate, thirtyDaysStr)
      )
    )

    return NextResponse.json(upcomingBillings)
  } catch (error) {
    console.error('Error fetching upcoming billings:', error)
    return NextResponse.json({ error: 'Failed to fetch upcoming billings' }, { status: 500 })
  }
}
