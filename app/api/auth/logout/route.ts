import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  cookieStore.delete('session')
  
  return Response.json({ message: 'Logged out successfully' })
}