import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { documents } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { eq } from 'drizzle-orm'
import { deleteFromGoogleDrive } from '../../../../lib/google-drive'

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

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const documentId = parseInt(resolvedParams.id)

    // Get document first
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete from Google Drive if it's a Google Drive file
    if (document.filePath && !document.filePath.startsWith('/uploads/') && !document.filePath.startsWith('uploads/')) {
      try {
        await deleteFromGoogleDrive(document.filePath)
      } catch (error) {
        console.error('Error deleting from Google Drive:', error)
        // Continue with database deletion even if Google Drive deletion fails
      }
    }

    // Delete from database
    await db.delete(documents).where(eq(documents.id, documentId))

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}

