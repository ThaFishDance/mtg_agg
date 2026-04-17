import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const gameId = parseInt(id, 10)
    if (isNaN(gameId)) {
      return NextResponse.json({ error: 'Invalid game id' }, { status: 400 })
    }

    const game = await db.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: game.id,
      started_at: game.startedAt,
      completed_at: game.completedAt,
      duration_seconds: game.durationSeconds,
      starting_life: game.startingLife,
      winner_name: game.winnerName,
      player_count: game.playerCount,
      pod_id: game.podId,
      players: game.players.map((p) => ({
        id: p.id,
        player_name: p.playerName,
        commander_name: p.commanderName,
        commander_colors: p.commanderColors,
        final_life: p.finalLife,
        final_poison: p.finalPoison,
        eliminated: p.eliminated,
        commander_damage_dealt: p.commanderDamageDealt,
      })),
    })
  } catch (error) {
    console.error('GET /api/games/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}

const PatchGameSchema = z.object({
  winnerName: z.string().min(1),
})

// PATCH /api/games/[id] — edit winner (OWNER of the game's pod only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id } = await params
  const gameId = parseInt(id, 10)
  if (isNaN(gameId)) {
    return NextResponse.json({ error: 'Invalid game id' }, { status: 400 })
  }

  const game = await db.game.findUnique({ where: { id: gameId } })
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (!game.podId) return NextResponse.json({ error: 'Game is not associated with a pod' }, { status: 400 })

  const membership = await db.podMember.findUnique({
    where: { podId_userId: { podId: game.podId, userId: session.user.id } },
  })
  if (!membership || membership.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = PatchGameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const updated = await db.game.update({
    where: { id: gameId },
    data: { winnerName: parsed.data.winnerName },
  })

  return NextResponse.json({ id: updated.id, winner_name: updated.winnerName })
}

// DELETE /api/games/[id] — delete game (OWNER of the game's pod only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id } = await params
  const gameId = parseInt(id, 10)
  if (isNaN(gameId)) {
    return NextResponse.json({ error: 'Invalid game id' }, { status: 400 })
  }

  const game = await db.game.findUnique({ where: { id: gameId } })
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (!game.podId) return NextResponse.json({ error: 'Game is not associated with a pod' }, { status: 400 })

  const membership = await db.podMember.findUnique({
    where: { podId_userId: { podId: game.podId, userId: session.user.id } },
  })
  if (!membership || membership.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.game.delete({ where: { id: gameId } })

  return new NextResponse(null, { status: 204 })
}
