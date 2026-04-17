import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

async function getMembership(podId: string, userId: string) {
  return db.podMember.findUnique({
    where: { podId_userId: { podId, userId } },
  })
}

// GET /api/pods/[id] — pod details + members (must be a member)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id: podId } = await params

  const membership = await getMembership(podId, session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const pod = await db.pod.findUnique({
    where: { id: podId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })
  if (!pod) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: pod.id,
    name: pod.name,
    description: pod.description,
    inviteCode: pod.inviteCode,
    createdAt: pod.createdAt,
    creatorId: pod.creatorId,
    myRole: membership.role,
    members: pod.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  })
}

const PatchPodSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(300).optional(),
})

// PATCH /api/pods/[id] — edit name/description (OWNER only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id: podId } = await params

  const membership = await getMembership(podId, session.user.id)
  if (!membership || membership.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = PatchPodSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const pod = await db.pod.update({
    where: { id: podId },
    data: parsed.data,
  })

  return NextResponse.json({ id: pod.id, name: pod.name, description: pod.description })
}

// DELETE /api/pods/[id] — delete pod (OWNER only, cascades games)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id: podId } = await params

  const membership = await getMembership(podId, session.user.id)
  if (!membership || membership.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.pod.delete({ where: { id: podId } })

  return new NextResponse(null, { status: 204 })
}
