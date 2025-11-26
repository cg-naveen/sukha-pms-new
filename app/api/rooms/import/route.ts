import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { rooms } from '../../../../shared/schema'
import { requireAuth } from '../../../../lib/auth'
import { insertRoomSchema } from '../../../../shared/schema'
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
        const roomData: any = {
          unitNumber: row['unit_number'] || row['unitNumber'] || '',
          roomType: row['room_type'] || row['roomType'] || 'studio',
          size: row['size'] ? parseInt(row['size']) : 0,
          floor: row['floor'] ? parseInt(row['floor']) : 1,
          numberOfBeds: row['number_of_beds'] || row['numberOfBeds'] ? parseInt(row['number_of_beds'] || row['numberOfBeds']) : 1,
          status: row['status'] || 'vacant',
          monthlyRate: row['monthly_rate'] || row['monthlyRate'] ? parseInt(row['monthly_rate'] || row['monthlyRate']) : 0,
          description: row['description'] || undefined,
        }

        const validated = insertRoomSchema.parse(roomData)
        await db.insert(rooms).values(validated)
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
    console.error('Error importing rooms:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to import rooms' 
    }, { status: 500 })
  }
}

