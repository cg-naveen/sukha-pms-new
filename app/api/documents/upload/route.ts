import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/auth'
import { uploadToOneDrive } from '../../../lib/onedrive'

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const residentId = formData.get('residentId') as string

    if (!file || !title || !residentId) {
      return NextResponse.json(
        { error: 'File, title, and resident ID are required' },
        { status: 400 }
      )
    }

    // Convert File to Buffer for OneDrive upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to OneDrive (if configured) or fallback to local storage
    let filePath: string;
    let oneDriveId: string | undefined;

    if (process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_CLIENT_SECRET) {
      try {
        const oneDriveResult = await uploadToOneDrive(buffer, file.name, file.type, {
          folder: `residents/${residentId}/documents`,
          fileName: file.name
        })
        filePath = oneDriveResult.webUrl || oneDriveResult.id;
        oneDriveId = oneDriveResult.id;
      } catch (error: any) {
        console.error('OneDrive upload failed, falling back to local storage:', error);
        // Fallback to local storage
        const fs = await import('fs');
        const path = await import('path');
        const uploadDir = path.join(process.cwd(), 'uploads', 'documents', residentId);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.name)}`;
        const localPath = path.join(uploadDir, fileName);
        fs.writeFileSync(localPath, buffer);
        filePath = `/uploads/documents/${residentId}/${fileName}`;
      }
    } else {
      // No OneDrive configured, use local storage
      const fs = await import('fs');
      const path = await import('path');
      const uploadDir = path.join(process.cwd(), 'uploads', 'documents', residentId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.name)}`;
      const localPath = path.join(uploadDir, fileName);
      fs.writeFileSync(localPath, buffer);
      filePath = `/uploads/documents/${residentId}/${fileName}`;
    }

    // Save document metadata to database
    const { db } = await import('../../../lib/db')
    const { documents, insertDocumentSchema } = await import('../../../shared/schema')
    
    const documentData = {
      residentId: parseInt(residentId),
      title,
      fileName: file.name,
      filePath: filePath, // Store OneDrive URL/ID or local path
      fileSize: file.size,
      mimeType: file.type
    }

    const validatedDocument = insertDocumentSchema.parse(documentData)
    const [newDocument] = await db.insert(documents).values(validatedDocument).returning()

    return NextResponse.json(newDocument, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    )
  }
}

