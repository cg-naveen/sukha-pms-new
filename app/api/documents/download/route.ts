import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/auth'
import { downloadFromOneDrive } from '../../../lib/onedrive'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }

    // Check if it's a OneDrive URL or local path
    if (filePath.startsWith('http')) {
      // OneDrive URL - redirect to the URL
      return NextResponse.redirect(filePath)
    } else {
      // Local file path
      const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''))
      
      // Security check - ensure file is within uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads')
      if (!fullPath.startsWith(uploadsDir)) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 403 })
      }

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      const fileBuffer = fs.readFileSync(fullPath)
      const fileName = path.basename(fullPath)

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    }
  } catch (error: any) {
    console.error('Error downloading file:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to download file' 
    }, { status: 500 })
  }
}

