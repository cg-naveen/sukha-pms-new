import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../../lib/db'
import { visitors } from '../../../../../../shared/schema'
import { eq } from 'drizzle-orm'
import QRCode from 'qrcode'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode } = await params

    // Verify the QR code exists
    const [visitor] = await db
      .select()
      .from(visitors)
      .where(eq(visitors.qrCode, qrCode))
      .limit(1)

    if (!visitor) {
      return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 })
    }

    // Generate QR code verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    const qrCodeVerifyUrl = `${baseUrl}/api/public/visitors/verify/${qrCode}`

    // Generate QR code as PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeVerifyUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
      scale: 8,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Return the image
    return new NextResponse(qrCodeBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error generating QR code image:', error)
    return NextResponse.json({ error: 'Failed to generate QR code image' }, { status: 500 })
  }
}

