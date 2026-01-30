import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/settings/file-storage
 * Returns Google Drive integration status (no secrets). Used by Settings > File Storage tab.
 */
export async function GET() {
  const authResult = await requireAuth(['admin', 'superadmin'])()
  if (authResult instanceof Response) return authResult

  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim()
    const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || '').trim()
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    const rootFolderId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim()

    const oauthConfigured =
      clientId.length > 0 && clientSecret.length > 0 && refreshToken.length > 0
    const serviceAccountConfigured =
      !!serviceAccountKey && typeof serviceAccountKey === 'string' && serviceAccountKey.trim().length > 0
    const rootFolderConfigured = rootFolderId.length > 0

    const storageType = oauthConfigured
      ? 'google_drive_oauth'
      : serviceAccountConfigured && rootFolderConfigured
        ? 'google_drive_service_account'
        : 'local'

    return NextResponse.json({
      storageType,
      oauthConfigured,
      serviceAccountConfigured,
      rootFolderConfigured,
      // For UI: is Google Drive active (either method)
      googleDriveActive: oauthConfigured || (serviceAccountConfigured && rootFolderConfigured),
    })
  } catch (error: any) {
    console.error('Error checking file storage config:', error)
    return NextResponse.json(
      { error: 'Failed to check file storage configuration' },
      { status: 500 }
    )
  }
}
