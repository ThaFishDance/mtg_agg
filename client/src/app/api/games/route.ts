import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const CreateGameSchema = z.object({
  startingLife: z.number().int().min(1).max(999).default(40),
  players: z.array(
    z.object({
      name: z.string().min(1),
      commanderName: z.string(),
      colorIdentity: z.array(z.string()).default([]),
    })
  ).min(2).max(6),
})

export async function GET() {
  try {
    const games = await db.game.findMany({
      where: { completedAt: { not: null } },
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
    const body = await request.json()
    const parsed = CreateGameSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { players, startingLife } = parsed.data

    const game = await db.game.create({
      data: {
        startingLife,
        playerCount: players.length,
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
