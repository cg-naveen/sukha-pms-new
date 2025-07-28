import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { storage } from '../server/storage'

const scryptAsync = promisify(scrypt)

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const buf = (await scryptAsync(password, salt, 64)) as Buffer
  return `${buf.toString('hex')}.${salt}`
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.')
  const hashedBuf = Buffer.from(hashed, 'hex')
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer
  return timingSafeEqual(hashedBuf, suppliedBuf)
}

export async function getCurrentUser(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const session = cookieStore.get('session')
    
    if (!session) {
      return null
    }

    // For simplicity, we'll decode the session token and get user
    // In production, you'd want to store sessions in a database
    const userId = await storage.getSessionUser(session.value)
    if (!userId) {
      return null
    }

    return await storage.getUser(userId)
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

export function requireAuth(handler: (req: NextRequest, user: any) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await getCurrentUser(request)
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(request, user)
  }
}

export function requireRole(roles: string[]) {
  return (handler: (req: NextRequest, user: any) => Promise<Response>) => {
    return async (request: NextRequest) => {
      const user = await getCurrentUser(request)
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (!roles.includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      return handler(request, user)
    }
  }
}