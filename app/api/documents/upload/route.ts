import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/auth'
import { uploadToGoogleDrive } from '../../../../lib/google-drive'

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

    const residentIdNum = parseInt(residentId);
    const residentDisplayId = `R-${residentIdNum.toString().padStart(5, '0')}`;

    // Convert File to Buffer for Google Drive upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Google Drive (if configured) or fallback to local storage
    let filePath: string;
    let googleDriveId: string | undefined;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)) {
      try {
        const googleDriveResult = await uploadToGoogleDrive(buffer, file.name, file.type, {
          folder: `residents/${residentDisplayId}/documents`,
          fileName: file.name
        })
        filePath = googleDriveResult.id; // Store Google Drive file ID
        googleDriveId = googleDriveResult.id;
      } catch (error: any) {
        console.error('Google Drive upload failed, falling back to local storage:', error);
        // Fallback to local storage
        const fs = await import('fs');
        const path = await import('path');
        const uploadDir = path.join(process.cwd(), 'uploads', 'documents', residentDisplayId);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.name)}`;
        const localPath = path.join(uploadDir, fileName);
        fs.writeFileSync(localPath, buffer);
        filePath = `/uploads/documents/${residentDisplayId}/${fileName}`;
      }
    } else {
      // No Google Drive configured, use local storage
      const fs = await import('fs');
      const path = await import('path');
      const uploadDir = path.join(process.cwd(), 'uploads', 'documents', residentDisplayId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.name)}`;
      const localPath = path.join(uploadDir, fileName);
      fs.writeFileSync(localPath, buffer);
      filePath = `/uploads/documents/${residentDisplayId}/${fileName}`;
    }

    // Save document metadata to database
    const { db } = await import('../../../../lib/db')
    const { documents, insertDocumentSchema } = await import('../../../../shared/schema')
    
    const documentData = {
      residentId: residentIdNum,
      title,
      fileName: file.name,
      filePath: filePath, // Store Google Drive file ID or local path
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

