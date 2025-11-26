import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { billings } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { eq } from 'drizzle-orm'
import { uploadToOneDrive } from '../../../../../lib/onedrive'
import fs from 'fs'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const billingId = parseInt(resolvedParams.id)

    // Get the billing record
    const [billing] = await db
      .select()
      .from(billings)
      .where(eq(billings.id, billingId))

    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    }

    // Get the file from form data
    const formData = await request.formData()
    const file = formData.get('receipt') as File

    if (!file) {
      return NextResponse.json({ error: 'Receipt PDF is required' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to OneDrive (if configured) or fallback to local storage
    let filePath: string;

    if (process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_CLIENT_SECRET) {
      try {
        const oneDriveResult = await uploadToOneDrive(buffer, file.name, file.type, {
          folder: `billings/receipts`,
          fileName: `receipt-${billingId}-${Date.now()}.pdf`
        })
        filePath = oneDriveResult.webUrl || oneDriveResult.id;
      } catch (error: any) {
        console.error('OneDrive upload failed, falling back to local storage:', error);
        // Fallback to local storage
        const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileName = `receipt-${billingId}-${Date.now()}-${Math.round(Math.random() * 1E9)}.pdf`;
        const localPath = path.join(uploadDir, fileName);
        fs.writeFileSync(localPath, buffer);
        filePath = `/uploads/receipts/${fileName}`;
      }
    } else {
      // No OneDrive configured, use local storage
      const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const fileName = `receipt-${billingId}-${Date.now()}-${Math.round(Math.random() * 1E9)}.pdf`;
      const localPath = path.join(uploadDir, fileName);
      fs.writeFileSync(localPath, buffer);
      filePath = `/uploads/receipts/${fileName}`;
    }

    // Update billing status to paid and save receipt file path
    const [updatedBilling] = await db
      .update(billings)
      .set({ 
        status: 'paid',
        invoiceFile: filePath,
        updatedAt: new Date()
      })
      .where(eq(billings.id, billingId))
      .returning()

    return NextResponse.json(updatedBilling)
  } catch (error: any) {
    console.error('Error marking billing as paid:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to mark billing as paid' 
    }, { status: 500 })
  }
}

