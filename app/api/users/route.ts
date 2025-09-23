import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { users } from '../../../shared/schema'
import { requireAuth, hashPassword } from '../../../lib/auth'

export async function GET() {
  const authResult = await requireAuth(['admin', 'superadmin'])()
  if (authResult instanceof Response) return authResult

  try {
    const allUsers = await db.select().from(users)
    // Remove passwords from response
    const usersWithoutPasswords = allUsers.map(({ password, ...user }) => user)
    return NextResponse.json(usersWithoutPasswords)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(['admin', 'superadmin'])()
  if (authResult instanceof Response) return authResult

  try {
    const body = await request.json()
    
    // Hash password
    if (body.password) {
      body.password = await hashPassword(body.password)
    }
    
    const newUser = await db.insert(users).values(body).returning()
    const { password, ...userWithoutPassword } = newUser[0]
    
    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
