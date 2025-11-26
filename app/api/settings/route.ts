import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { settings } from '../../../shared/schema'
import { requireAuth } from '../../../lib/auth'
import { insertSettingsSchema } from '../../../shared/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const authResult = await requireAuth(['admin', 'superadmin'])()
  if (authResult instanceof Response) return authResult

  try {
    // Get the first (and only) settings record, or create default if none exists
    const existingSettings = await db
      .select()
      .from(settings)
      .limit(1)

    if (existingSettings.length === 0) {
      // Create default settings
      const defaultSettings = await db
        .insert(settings)
        .values({
          propertyName: 'Sukha Senior Resort',
          address: '',
          contactEmail: '',
          contactPhone: '',
          enableEmailNotifications: true,
          enableSmsNotifications: false,
          billingReminderDays: 7,
          visitorApprovalNotification: true,
          billingGenerationEnabled: true,
          billingGenerationHour: 2,
          billingGenerationMinute: 0,
        })
        .returning()

      return NextResponse.json(defaultSettings[0])
    }

    return NextResponse.json(existingSettings[0])
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'superadmin'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    
    // Validate the request body
    const validated = insertSettingsSchema.parse(body)

    // Get existing settings
    const existingSettings = await db
      .select()
      .from(settings)
      .limit(1)

    if (existingSettings.length === 0) {
      // Create new settings
      const newSettings = await db
        .insert(settings)
        .values({
          ...validated,
          propertyName: validated.propertyName || 'Sukha Senior Resort',
          address: validated.address || '',
          contactEmail: validated.contactEmail || '',
          contactPhone: validated.contactPhone || '',
          enableEmailNotifications: validated.enableEmailNotifications ?? true,
          enableSmsNotifications: validated.enableSmsNotifications ?? false,
          billingReminderDays: validated.billingReminderDays ?? 7,
          visitorApprovalNotification: validated.visitorApprovalNotification ?? true,
          billingGenerationEnabled: validated.billingGenerationEnabled ?? true,
          billingGenerationHour: validated.billingGenerationHour ?? 2,
          billingGenerationMinute: validated.billingGenerationMinute ?? 0,
        })
        .returning()

      return NextResponse.json(newSettings[0])
    } else {
      // Update existing settings (id is always 1 for single-row table)
      const updatedSettings = await db
        .update(settings)
        .set({
          ...validated,
          updatedAt: new Date(),
        })
        .where(eq(settings.id, existingSettings[0].id))
        .returning()

      return NextResponse.json(updatedSettings[0])
    }
  } catch (error: any) {
    console.error('Error updating settings:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}

