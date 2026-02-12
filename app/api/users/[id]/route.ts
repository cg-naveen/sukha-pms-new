import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { users } from '../../../../shared/schema'
import { requireAuth, hashPassword } from '../../../../lib/auth'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin', 'superadmin'])()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const user = await db.select().from(users).where(eq(users.id, parseInt(id)))
    
    if (!user.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { password, ...userWithoutPassword } = user[0] as any
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin', 'superadmin'])()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const body = await request.json()

    // Hash password if provided, otherwise remove from update
    if (body.password) {
      body.password = await hashPassword(body.password)
    } else {
      delete body.password
    }

    // Add updatedAt timestamp
    body.updatedAt = new Date()

    const updatedUser = await db
      .update(users)
      .set(body)
      .where(eq(users.id, parseInt(id)))
      .returning()

    if (!updatedUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { password, ...userWithoutPassword } = updatedUser[0] as any
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(['admin', 'superadmin'])()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const deleted = await db
      .delete(users)
      .where(eq(users.id, parseInt(id)))
      .returning()

    if (!deleted.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
