import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { storage } from '../../../server/storage'
import { z } from 'zod'

const scryptAsync = promisify(scrypt)

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.')
  const hashedBuf = Buffer.from(hashed, 'hex')
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer
  return timingSafeEqual(hashedBuf, suppliedBuf)
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = loginSchema.parse(body)

    const user = await storage.getUserByUsername(username)
    if (!user || !(await comparePasswords(password, user.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create session token
    const sessionToken = randomBytes(32).toString('hex')
    
    // Store session (implement session storage)
    // For now, we'll use a simple JWT-like approach with cookies
    const cookieStore = cookies()
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return NextResponse.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}