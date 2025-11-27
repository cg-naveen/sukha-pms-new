import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { users } from '../../../shared/schema'
import { eq } from 'drizzle-orm'
import { comparePasswords, createJWT } from '../../../lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set')
      return NextResponse.json({ 
        message: 'Database configuration error',
        error: 'DATABASE_URL environment variable is missing'
      }, { status: 500 })
    }
    
    // Find user
    let user
    try {
      user = await db.select().from(users).where(eq(users.username, username)).limit(1)
    } catch (dbError: any) {
      console.error('Database query error:', {
        message: dbError?.message,
        code: dbError?.code,
        stack: dbError?.stack
      })
      return NextResponse.json({ 
        message: 'Database connection error',
        error: dbError?.message || 'Failed to connect to database'
      }, { status: 500 })
    }
    
    if (!user.length) {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 })
    }
    
    // Check password
    const isValid = await comparePasswords(password, user[0].password)
    if (!isValid) {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 })
    }
    
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set')
      return NextResponse.json({ 
        message: 'Authentication configuration error',
        error: 'JWT_SECRET environment variable is missing'
      }, { status: 500 })
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
    
  } catch (error: any) {
    console.error('Login error:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      stack: error?.stack
    })
    return NextResponse.json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}
