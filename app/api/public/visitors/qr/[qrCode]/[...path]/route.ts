import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../../../../lib/db'
import { visitors } from '../../../../../../../../shared/schema'
import { eq } from 'drizzle-orm'
import QRCode from 'qrcode'

/**
 * Catch-all route to handle /image.png URLs
 * Redirects to the main image route
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string; path: string[] }> }
) {
  try {
    const { qrCode, path } = await params
    
    // If path is ['image.png'], redirect to the image route
    if (path && path[0] === 'image.png') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      const imageUrl = `${baseUrl}/api/public/visitors/qr/${qrCode}/image`
      
      // Fetch from the main image route and return it
      const response = await fetch(imageUrl)
      if (response.ok) {
        const buffer = await response.arrayBuffer()
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
          },
        })
      }
    }
    
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('Error in catch-all route:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

