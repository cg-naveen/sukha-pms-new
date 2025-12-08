import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/auth'

export async function GET() {
  const authResult = await requireAuth(['admin', 'superadmin'])()
  if (authResult instanceof Response) return authResult

  try {
    // Check if Wabot credentials are configured
    const instanceId = process.env.WABOT_INSTANCE_ID
    const accessToken = process.env.WABOT_ACCESS_TOKEN

    return NextResponse.json({
      instanceIdConfigured: !!instanceId && instanceId.trim() !== '',
      accessTokenConfigured: !!accessToken && accessToken.trim() !== '',
    })
  } catch (error: any) {
    console.error('Error checking Wabot credentials:', error)
    return NextResponse.json(
      { error: 'Failed to check credentials' },
      { status: 500 }
    )
  }
}

