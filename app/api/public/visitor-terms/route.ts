import { NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { settings } from '../../../../shared/schema'

export async function GET() {
  try {
    // Get the first (and only) settings record
    const existingSettings = await db
      .select()
      .from(settings)
      .limit(1)

    if (existingSettings.length === 0) {
      // Return default T&C if no settings exist
      return NextResponse.json({
        termsAndConditions: `# Visitor Terms and Conditions

## General Guidelines

1. All visitors must register before entering the premises
2. Visitors must arrive at their scheduled time
3. A valid ID must be presented at security check-in
4. Visitors must respect the privacy and rest times of all residents
5. Children must be supervised at all times
6. Follow all health and safety protocols

## Visitor Responsibilities

- Maintain a quiet and respectful environment
- Do not disturb other residents
- Follow all facility rules and regulations
- Report any concerns to staff immediately

## Security

- All visitors are subject to security screening
- Visitors must wear visitor badges at all times
- Unauthorized access is strictly prohibited

By registering, you agree to comply with all terms and conditions.`
      })
    }

    return NextResponse.json({
      termsAndConditions: existingSettings[0].visitorTermsAndConditions || `# Visitor Terms and Conditions

## General Guidelines

1. All visitors must register before entering the premises
2. Visitors must arrive at their scheduled time
3. A valid ID must be presented at security check-in
4. Visitors must respect the privacy and rest times of all residents
5. Children must be supervised at all times
6. Follow all health and safety protocols

## Visitor Responsibilities

- Maintain a quiet and respectful environment
- Do not disturb other residents
- Follow all facility rules and regulations
- Report any concerns to staff immediately

## Security

- All visitors are subject to security screening
- Visitors must wear visitor badges at all times
- Unauthorized access is strictly prohibited

By registering, you agree to comply with all terms and conditions.`
    })
  } catch (error: any) {
    console.error('Error fetching visitor terms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terms and conditions' },
      { status: 500 }
    )
  }
}

