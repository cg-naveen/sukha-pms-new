import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { residents, billings, rooms, occupancy, settings } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { eq, and, gte, lte } from 'drizzle-orm'

/**
 * Generate billings for residents based on their billingDate
 * This endpoint should be called daily (via cron job) to automatically create monthly billings
 */
export async function POST(request: NextRequest) {
  // Allow both admin/staff manual trigger and system cron job
  // For cron jobs, we can use a secret token in the Authorization header
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // If cron secret is provided and matches, allow access
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Cron job access - no user auth required
  } else {
    // Manual trigger - require admin/staff auth
    const authResult = await requireAuth(['admin', 'staff'])()
    if (authResult instanceof Response) return authResult
  }

  try {
    // Check if billing generation is enabled in settings
    const settings = await db.query.settings.findFirst()
    if (settings && !settings.billingGenerationEnabled) {
      return NextResponse.json({
        message: "Billing generation is disabled in settings",
        results: {
          generated: 0,
          skipped: 0,
          errors: [],
        },
        date: new Date().toISOString().split('T')[0],
      })
    }

    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    // Get all residents with their active occupancy and room info
    const allResidents = await db.query.residents.findMany({
      with: {
        occupancy: {
          where: (occupancy, { eq }) => eq(occupancy.active, true),
          with: {
            room: true,
          },
        },
      },
    })

    const results = {
      generated: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const resident of allResidents) {
      try {
        // Check if resident's billingDate matches today's day
        if (resident.billingDate !== currentDay) {
          continue // Skip residents whose billing date is not today
        }

        // Get active occupancy for this resident
        const activeOccupancy = resident.occupancy?.find(occ => occ.active)
        if (!activeOccupancy || !activeOccupancy.room) {
          results.skipped++
          continue // Skip residents without active occupancy or room
        }

        const room = activeOccupancy.room

        // Calculate due date (billingDate of current month)
        const dueDate = new Date(currentYear, currentMonth, resident.billingDate)
        const dueDateStr = dueDate.toISOString().split('T')[0]

        // Check if billing already exists for this resident and month
        const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]

        const existingBilling = await db.query.billings.findFirst({
          where: (billings, { and, eq, gte, lte }) => and(
            eq(billings.residentId, resident.id),
            eq(billings.dueDate, dueDateStr)
          ),
        })

        if (existingBilling) {
          results.skipped++
          continue // Billing already exists for this month
        }

        // Create new billing
        await db.insert(billings).values({
          residentId: resident.id,
          occupancyId: activeOccupancy.id,
          amount: room.monthlyRate,
          dueDate: dueDateStr,
          status: 'new_invoice',
          description: `Monthly rent for ${room.unitNumber} - ${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          billingAccount: 'sukha_golden', // Default, can be customized later
        })

        results.generated++
      } catch (error: any) {
        results.errors.push(`Resident ${resident.id} (${resident.fullName}): ${error.message}`)
        console.error(`Error generating billing for resident ${resident.id}:`, error)
      }
    }

    return NextResponse.json({
      message: `Billing generation completed: ${results.generated} generated, ${results.skipped} skipped`,
      results,
      date: today.toISOString().split('T')[0],
    })
  } catch (error: any) {
    console.error('Error generating billings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate billings' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to manually trigger billing generation (for testing/admin use)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  // Call the POST logic
  return POST(request)
}

