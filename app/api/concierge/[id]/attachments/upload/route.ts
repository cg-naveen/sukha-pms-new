import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../../../lib/auth'
import { uploadToGoogleDrive } from '../../../../../../lib/google-drive'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const bookingId = parseInt(id)
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let filePath: string
    const bookingFolder = `concierge/booking-${bookingId}`

    if (
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)
    ) {
      try {
        const result = await uploadToGoogleDrive(buffer, file.name, file.type, {
          folder: bookingFolder,
          fileName: file.name,
        })
        filePath = result.id
      } catch {
        filePath = await saveLocally(buffer, file.name, bookingFolder)
      }
    } else {
      filePath = await saveLocally(buffer, file.name, bookingFolder)
    }

    const { db } = await import('../../../../../../lib/db')
    const { companionBookingAttachments } = await import('../../../../../../shared/schema')

    const [attachment] = await db
      .insert(companionBookingAttachments)
      .values({
        booking_id: bookingId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .returning()

    return NextResponse.json(attachment, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json({ error: error.message || 'Failed to upload attachment' }, { status: 500 })
  }
}

async function saveLocally(buffer: Buffer, originalName: string, folder: string): Promise<string> {
  const fs = await import('fs')
  const path = await import('path')
  const uploadDir = path.join(process.cwd(), 'uploads', folder)
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalName)}`
  fs.writeFileSync(path.join(uploadDir, fileName), buffer)
  return `/uploads/${folder}/${fileName}`
}
