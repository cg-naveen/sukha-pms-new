import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../../../lib/db'
import { visitors } from '../../../../../../../shared/schema'
import { eq } from 'drizzle-orm'
import QRCode from 'qrcode'

/**
 * Public endpoint to generate and serve QR code images
 * This endpoint must be publicly accessible for Wabot to fetch the image
 * Supports both /image and /image.png URLs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode } = await params

    if (!qrCode) {
      return NextResponse.json({ error: 'QR code is required' }, { status: 400 })
    }

    console.log('QR Code Image Request:', qrCode) // Debug log

    // Verify the QR code exists
    const [visitor] = await db
      .select()
      .from(visitors)
      .where(eq(visitors.qrCode, qrCode))
      .limit(1)

    if (!visitor) {
      console.log('QR code not found in database:', qrCode) // Debug log
      return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 })
    }

    console.log('Visitor found:', visitor.id) // Debug log

    // Generate QR code verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
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

    // Return the image with proper headers for public access
    return new NextResponse(qrCodeBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*', // Allow CORS for Wabot
      },
    })
  } catch (error) {
    console.error('Error generating QR code image:', error)
    return NextResponse.json({ error: 'Failed to generate QR code image' }, { status: 500 })
  }
}

