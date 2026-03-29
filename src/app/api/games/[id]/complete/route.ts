import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const CompleteGameSchema = z.object({
  winnerName: z.string().min(1),
  players: z.array(
    z.object({
      id: z.number().int(),
      finalLife: z.number().int(),
      finalPoison: z.number().int().default(0),
      eliminated: z.boolean().default(false),
      commanderDamageDealt: z.number().int().default(0),
    })
  ),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const gameId = parseInt(id, 10)
    if (isNaN(gameId)) {
      return NextResponse.json({ error: 'Invalid game id' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = CompleteGameSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { winnerName, players } = parsed.data

    const game = await db.game.findUnique({ where: { id: gameId } })
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const completedAt = new Date()
    const durationSeconds = Math.floor(
      (completedAt.getTime() - game.startedAt.getTime()) / 1000
    )

    await db.$transaction([
      db.game.update({
        where: { id: gameId },
        data: {
          completedAt,
          durationSeconds,
          winnerName,
        },
      }),
      ...players.map((p) =>
        db.gamePlayer.update({
          where: { id: p.id },
          data: {
            finalLife: p.finalLife,
            finalPoison: p.finalPoison,
            eliminated: p.eliminated,
            commanderDamageDealt: p.commanderDamageDealt,
          },
        })
      ),
    ])

    return NextResponse.json({ success: true, durationSeconds })
  } catch (error) {
    console.error('POST /api/games/[id]/complete error:', error)
    return NextResponse.json({ error: 'Failed to complete game' }, { status: 500 })
  }
}
