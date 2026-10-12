import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
      include: {
        players: true,
      },
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
