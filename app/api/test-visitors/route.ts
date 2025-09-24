import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../lib/db'
import { visitors } from '../../shared/schema'

export async function GET(request: NextRequest) {
  try {
    const allVisitors = await db.select().from(visitors)
    return NextResponse.json({ count: allVisitors.length, visitors: allVisitors })
  } catch (error) {
    console.error('Error fetching visitors:', error)
    return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: 500 })
  }
}
