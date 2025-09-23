import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { users } from '../../../../shared/schema'
import { eq } from 'drizzle-orm'
import { comparePasswords, createJWT } from '../../../../lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    // Find user
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1)
    
    if (!user.length) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    
    // Check password
    const isValid = await comparePasswords(password, user[0].password)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    
    // Create JWT
    const token = await createJWT({
      id: user[0].id,
      username: user[0].username,
      role: user[0].role,
      fullName: user[0].fullName
    })
    
    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user[0]
    return NextResponse.json(userWithoutPassword)
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
