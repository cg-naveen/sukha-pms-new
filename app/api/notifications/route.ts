import { NextResponse } from 'next/server'

// Public placeholder endpoint to avoid noisy 404s in dev
export async function GET() {
  return NextResponse.json([], { status: 200 })
}


