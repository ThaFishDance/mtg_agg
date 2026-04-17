import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

const JoinSchema = z.object({
  inviteCode: z.string().min(1),
})

// POST /api/pods/join — join a pod via invite code
export async function POST(request: Request) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await request.json()
  const parsed = JoinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const pod = await db.pod.findUnique({
    where: { inviteCode: parsed.data.inviteCode },
  })
  if (!pod) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  const existing = await db.podMember.findUnique({
    where: { podId_userId: { podId: pod.id, userId: session.user.id } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Already a member of this pod' }, { status: 409 })
  }

  await db.podMember.create({
    data: { podId: pod.id, userId: session.user.id, role: 'MEMBER' },
  })

  return NextResponse.json({ id: pod.id, name: pod.name }, { status: 201 })
}
