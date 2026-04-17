import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { requireSession } from '@/lib/session'

interface ColorRow {
  color: string
  wins: bigint
  appearances: bigint
}

// GET /api/pods/[id]/stats/colors — color win rate filtered by pod (members only)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id: podId } = await params

  const membership = await db.podMember.findUnique({
    where: { podId_userId: { podId, userId: session.user.id } },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const rows = await db.$queryRaw<ColorRow[]>(Prisma.sql`
      SELECT
        color,
        SUM(CASE WHEN g.winner_name = gp.player_name THEN 1 ELSE 0 END) AS wins,
        COUNT(*) AS appearances
      FROM game_players gp
      JOIN games g ON g.id = gp.game_id
      CROSS JOIN LATERAL unnest(gp.commander_colors) AS color
      WHERE g.completed_at IS NOT NULL
        AND g.pod_id = ${podId}
      GROUP BY color
    `)

    const totalGames = await db.game.count({
      where: { completedAt: { not: null }, podId },
    })

    const colors = rows.map((row) => {
      const wins = Number(row.wins)
      const appearances = Number(row.appearances)
      const winRate = appearances > 0 ? Math.round((wins / appearances) * 100) : 0
      return { color: row.color, wins, appearances, winRate }
    })

    return NextResponse.json({ totalGames, colors })
  } catch (err) {
    console.error(`GET /api/pods/${podId}/stats/colors error:`, err)
    return NextResponse.json({ error: 'Failed to fetch color stats' }, { status: 500 })
  }
}
