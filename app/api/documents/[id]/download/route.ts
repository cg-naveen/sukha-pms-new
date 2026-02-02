import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { documents } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { eq } from 'drizzle-orm'
import { downloadFromGoogleDrive } from '../../../../../lib/google-drive'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const documentId = parseInt(resolvedParams.id)

    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if it's a Google Drive file or local file
    if (document.filePath && !document.filePath.startsWith('/uploads/') && !document.filePath.startsWith('uploads/')) {
      // Download from Google Drive
      try {
        const fileBuffer = await downloadFromGoogleDrive(document.filePath)
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': document.mimeType,
            'Content-Disposition': `attachment; filename="${document.fileName}"`,
          },
        })
      } catch (error: any) {
        console.error('Google Drive download failed:', error)
        return NextResponse.json(
          { error: 'Failed to download from Google Drive' },
          { status: 500 }
        )
      }
    } else {
      // Local file - check if exists
      const filePath = document.filePath.startsWith('/')
        ? path.join(process.cwd(), document.filePath)
        : path.join(process.cwd(), document.filePath)
      
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      const fileBuffer = fs.readFileSync(filePath)
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': document.mimeType,
          'Content-Disposition': `attachment; filename="${document.fileName}"`,
        },
      })
    }
  } catch (error) {
    console.error('Error downloading document:', error)
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 })
  }
}

