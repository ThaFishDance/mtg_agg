import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

const CreateGameSchema = z.object({
  podId: z.string().cuid(),
  startingLife: z.number().int().min(1).max(999).default(40),
  players: z.array(
    z.object({
      name: z.string().min(1),
      commanderName: z.string(),
      colorIdentity: z.array(z.string()).default([]),
    })
  ).min(2).max(6),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const podId = searchParams.get('podId')

    // If podId is provided, verify the caller is a pod member
    if (podId) {
      const { session, error } = await requireSession()
      if (error) return error

      const membership = await db.podMember.findUnique({
        where: { podId_userId: { podId, userId: session.user.id } },
      })
      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const games = await db.game.findMany({
      where: {
        completedAt: { not: null },
        ...(podId ? { podId } : {}),
      },
      orderBy: { startedAt: 'desc' },
      include: {
        players: {
          select: {
            id: true,
            playerName: true,
            commanderName: true,
            commanderColors: true,
            finalLife: true,
            finalPoison: true,
            eliminated: true,
          },
        },
      },
    })

    const result = games.map((g) => ({
      id: g.id,
      started_at: g.startedAt,
      completed_at: g.completedAt,
      duration_seconds: g.durationSeconds,
      starting_life: g.startingLife,
      winner_name: g.winnerName,
      player_count: g.playerCount,
      pod_id: g.podId,
      players: g.players.map((p) => ({
        id: p.id,
        player_name: p.playerName,
        commander_name: p.commanderName,
        commander_colors: p.commanderColors,
        final_life: p.finalLife,
        final_poison: p.finalPoison,
        eliminated: p.eliminated,
      })),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/games error:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireSession()
    if (error) return error

    const body = await request.json()
    const parsed = CreateGameSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { players, startingLife, podId } = parsed.data

    // Verify caller is a member of the pod
    const membership = await db.podMember.findUnique({
      where: { podId_userId: { podId, userId: session.user.id } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this pod' }, { status: 403 })
    }

    const game = await db.game.create({
      data: {
        startingLife,
        playerCount: players.length,
        podId,
        players: {
          create: players.map((p) => ({
            playerName: p.name,
            commanderName: p.commanderName || null,
            commanderColors: p.colorIdentity,
          })),
        },
      },
      include: {
        players: {
          select: { id: true, playerName: true },
        },
      },
    })

    return NextResponse.json({
      gameId: game.id,
      players: game.players.map((p) => ({ id: p.id, name: p.playerName })),
    })
  } catch (error) {
    console.error('POST /api/games error:', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}
