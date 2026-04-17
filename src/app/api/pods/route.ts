import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

// GET /api/pods — list pods the caller belongs to
export async function GET() {
  const { session, error } = await requireSession()
  if (error) return error

  const memberships = await db.podMember.findMany({
    where: { userId: session.user.id },
    include: {
      pod: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  const pods = memberships.map((m) => ({
    id: m.pod.id,
    name: m.pod.name,
    description: m.pod.description,
    inviteCode: m.pod.inviteCode,
    role: m.role,
    memberCount: m.pod._count.members,
    createdAt: m.pod.createdAt,
  }))

  return NextResponse.json(pods)
}

const CreatePodSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(300).optional(),
})

// POST /api/pods — create a pod and auto-add caller as OWNER
export async function POST(request: Request) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await request.json()
  const parsed = CreatePodSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const inviteCode = randomBytes(4).toString('hex')

  const pod = await db.pod.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      inviteCode,
      creatorId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: 'OWNER',
        },
      },
    },
  })

  return NextResponse.json(
    { id: pod.id, name: pod.name, inviteCode: pod.inviteCode },
    { status: 201 }
  )
}
