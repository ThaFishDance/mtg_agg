import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const WUBRG = ['W', 'U', 'B', 'R', 'G']

export async function GET() {
  try {
    const [players, totalGames] = await Promise.all([
      db.gamePlayer.findMany({
        where: { game: { completedAt: { not: null } } },
        select: {
          playerName: true,
          commanderColors: true,
          game: { select: { winnerName: true } },
        },
      }),
      db.game.count({ where: { completedAt: { not: null } } }),
    ])

    // Individual color stats
    const colorMap: Record<string, { wins: number; appearances: number }> = {}
    // Combination stats — key is colors sorted in WUBRG order joined by comma
    const combMap: Record<string, { colors: string[]; wins: number; appearances: number }> = {}

    for (const player of players) {
      const isWinner = player.game.winnerName === player.playerName
      const sorted = [...player.commanderColors].sort(
        (a, b) => WUBRG.indexOf(a) - WUBRG.indexOf(b)
      )

      // Individual
      for (const color of sorted) {
        if (!colorMap[color]) colorMap[color] = { wins: 0, appearances: 0 }
        colorMap[color].appearances++
        if (isWinner) colorMap[color].wins++
      }

      // Combination
      const combKey = sorted.join(',')
      if (!combMap[combKey]) combMap[combKey] = { colors: sorted, wins: 0, appearances: 0 }
      combMap[combKey].appearances++
      if (isWinner) combMap[combKey].wins++
    }

    const colors = Object.entries(colorMap).map(([color, { wins, appearances }]) => ({
      color,
      wins,
      appearances,
      winRate: Math.round((wins / appearances) * 100),
    }))

    const combinations = Object.values(combMap)
      .map(({ colors, wins, appearances }) => ({
        colors,
        wins,
        appearances,
        winRate: Math.round((wins / appearances) * 100),
      }))
      .sort((a, b) => b.appearances - a.appearances || a.colors.length - b.colors.length)

    return NextResponse.json({ totalGames, colors, combinations })
  } catch (error) {
    console.error('GET /api/games/stats/colors error:', error)
    return NextResponse.json({ error: 'Failed to fetch color stats' }, { status: 500 })
  }
}
