import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../../../../lib/db'
import { visitors } from '../../../../../../../../shared/schema'
import { eq } from 'drizzle-orm'
import QRCode from 'qrcode'

/**
 * Catch-all route to handle /image.png URLs
 * Generates QR code image directly (same logic as /image route)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string; path: string[] }> }
) {
  try {
    const { qrCode, path } = await params
    
    // Only handle image.png path
    if (!path || path[0] !== 'image.png') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!qrCode) {
      return NextResponse.json({ error: 'QR code is required' }, { status: 400 })
    }

    console.log('QR Code Image Request (.png):', qrCode) // Debug log

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

