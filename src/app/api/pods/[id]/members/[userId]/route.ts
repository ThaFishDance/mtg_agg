import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

// DELETE /api/pods/[id]/members/[userId] — remove member (OWNER only, cannot remove self)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id: podId, userId: targetUserId } = await params

  const membership = await db.podMember.findUnique({
    where: { podId_userId: { podId, userId: session.user.id } },
  })
  if (!membership || membership.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself from the pod' }, { status: 400 })
  }

  const target = await db.podMember.findUnique({
    where: { podId_userId: { podId, userId: targetUserId } },
  })
  if (!target) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  await db.podMember.delete({
    where: { podId_userId: { podId, userId: targetUserId } },
  })

  return new NextResponse(null, { status: 204 })
}
