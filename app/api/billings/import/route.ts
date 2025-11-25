import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { billings } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { insertBillingSchema } from '../../../../shared/schema'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have headers and at least one data row' }, { status: 400 })
    }

    // Parse CSV with proper quote handling
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''))
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''))
      return result
    }

    const headers = parseCSVLine(lines[0])
    const data: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length !== headers.length) continue

      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const row of data) {
      try {
        const billingData: any = {
          residentId: row['resident_id'] || row['residentId'] ? parseInt(row['resident_id'] || row['residentId']) : undefined,
          amount: row['amount'] ? parseInt(row['amount']) : 0,
          dueDate: row['due_date'] || row['dueDate'] || new Date().toISOString().split('T')[0],
          status: row['status'] || 'pending',
          description: row['description'] || undefined,
          billingAccount: row['billing_account'] || row['billingAccount'] || 'sukha_golden',
        }

        if (!billingData.residentId) {
          throw new Error('resident_id is required')
        }

        const validated = insertBillingSchema.parse(billingData)
        await db.insert(billings).values(validated)
        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push(`Row ${data.indexOf(row) + 2}: ${error.message || 'Validation failed'}`)
      }
    }

    return NextResponse.json({
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
      results
    })
  } catch (error: any) {
    console.error('Error importing billings:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to import billings' 
    }, { status: 500 })
  }
}

