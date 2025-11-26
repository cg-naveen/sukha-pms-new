import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { residents } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { insertResidentSchema } from '../../../../shared/schema'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'staff'])()
  if (authResult instanceof Response) return authResult

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file content
    const text = await file.text()
    
    // Parse CSV with proper quote handling
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have headers and at least one data row' }, { status: 400 })
    }

    // Parse headers
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

    // Validate and insert data
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Track seen ID numbers within the CSV to detect duplicates
    const seenIdNumbers = new Set<string>()

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        // Map CSV columns to schema fields
        const residentData: any = {
          fullName: (row['full_name'] || row['fullName'] || '').trim(),
          email: (row['email'] || '').trim(),
          phone: (row['phone'] || '').trim(),
          countryCode: (row['country_code'] || row['countryCode'] || '+60').trim(),
          dateOfBirth: (row['date_of_birth'] || row['dateOfBirth']) ? String(row['date_of_birth'] || row['dateOfBirth']).trim() : undefined,
          idNumber: row['id_number'] || row['idNumber'] ? (row['id_number'] || row['idNumber']).trim() : undefined,
          address: row['address'] ? (row['address']).trim() : undefined,
          salesReferral: (row['sales_referral'] || row['salesReferral'] || 'Other').trim(),
          billingDate: row['billing_date'] || row['billingDate'] ? parseInt(row['billing_date'] || row['billingDate']) : 1,
          numberOfBeds: row['number_of_beds'] || row['numberOfBeds'] ? parseInt(row['number_of_beds'] || row['numberOfBeds']) : 1,
        }

        // Check required fields
        if (!residentData.fullName || residentData.fullName.length < 2) {
          throw new Error('Full name is required and must be at least 2 characters')
        }
        if (!residentData.email) {
          throw new Error('Email is required')
        }
        if (!residentData.phone || residentData.phone.length < 10) {
          throw new Error('Phone is required and must be at least 10 characters')
        }

        // Check for duplicate ID numbers within the CSV file
        if (residentData.idNumber) {
          if (seenIdNumbers.has(residentData.idNumber)) {
            throw new Error(`Duplicate ID number "${residentData.idNumber}" found in CSV file`)
          }
          seenIdNumbers.add(residentData.idNumber)
        }

        // Validate with schema
        const validated = insertResidentSchema.parse(residentData)
        
        // Check if resident with same idNumber exists in database (if idNumber is provided)
        if (validated.idNumber) {
          const existing = await db
            .select()
            .from(residents)
            .where(eq(residents.idNumber, validated.idNumber))
            .limit(1)
          
          if (existing.length > 0) {
            // Update existing resident
            await db
              .update(residents)
              .set({
                ...validated,
                updatedAt: new Date(),
              })
              .where(eq(residents.idNumber, validated.idNumber))
            results.success++
            continue
          }
        }
        
        // Insert new resident
        await db.insert(residents).values(validated)
        results.success++
      } catch (error: any) {
        results.failed++
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
          results.errors.push(`Row ${i + 2}: ${errorMessages}`)
        } else {
          results.errors.push(`Row ${i + 2}: ${error.message || 'Validation failed'}`)
        }
      }
    }

    return NextResponse.json({
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
      results,
      ...(results.errors.length > 0 && { errorDetails: results.errors })
    })
  } catch (error: any) {
    console.error('Error importing residents:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to import residents' 
    }, { status: 500 })
  }
}

