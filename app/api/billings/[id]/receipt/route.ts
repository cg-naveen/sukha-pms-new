import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'
import { billings } from '../../../../../shared/schema'
import { requireAuth } from '../../../../../lib/auth'
import { eq } from 'drizzle-orm'
import { downloadFromGoogleDrive } from '../../../../../lib/google-drive'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/billings/[id]/receipt
 * Serves the billing receipt PDF (from Google Drive or local storage).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()()
  if (authResult instanceof Response) return authResult

  try {
    const resolvedParams = await params
    const billingId = parseInt(resolvedParams.id)

    const [billing] = await db
      .select()
      .from(billings)
      .where(eq(billings.id, billingId))

    if (!billing || !billing.invoiceFile) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    const invoiceFile = billing.invoiceFile

    // External URL (legacy OneDrive, etc.) – redirect
    if (invoiceFile.startsWith('http')) {
      return NextResponse.redirect(invoiceFile)
    }

    // Google Drive file ID (no slash, no http)
    if (!invoiceFile.includes('/') && !invoiceFile.startsWith('/')) {
      const buffer = await downloadFromGoogleDrive(invoiceFile)
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="receipt-${billingId}.pdf"`,
        },
      })
    }

    // Local path (e.g. /uploads/receipts/...)
    const normalizedPath = invoiceFile.startsWith('/') ? invoiceFile.slice(1) : invoiceFile
    const fullPath = path.join(process.cwd(), normalizedPath)
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fullPath.startsWith(uploadsDir) || !fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Receipt file not found' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(fullPath)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${billingId}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error serving billing receipt:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load receipt' },
      { status: 500 }
    )
  }
}
