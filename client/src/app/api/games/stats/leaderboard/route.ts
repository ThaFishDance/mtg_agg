import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const rows = await db.gamePlayer.findMany({
      where: { game: { completedAt: { not: null } } },
      select: {
        playerName: true,
        commanderName: true,
        commanderColors: true,
        game: { select: { winnerName: true } },
      },
    })

    const playerMap: Record<string, { wins: number; appearances: number }> = {}
    const commanderMap: Record<string, { commanderColors: string[]; wins: number; appearances: number }> = {}

    for (const row of rows) {
      const isWinner = row.game.winnerName === row.playerName

      if (!playerMap[row.playerName]) playerMap[row.playerName] = { wins: 0, appearances: 0 }
      playerMap[row.playerName].appearances++
      if (isWinner) playerMap[row.playerName].wins++

      if (row.commanderName) {
        if (!commanderMap[row.commanderName]) {
          commanderMap[row.commanderName] = { commanderColors: row.commanderColors, wins: 0, appearances: 0 }
        }
        commanderMap[row.commanderName].appearances++
        if (isWinner) commanderMap[row.commanderName].wins++
      }
    }

    const sort = (a: { wins: number; winRate: number }, b: { wins: number; winRate: number }) =>
      b.wins - a.wins || b.winRate - a.winRate

    const players = Object.entries(playerMap)
      .map(([name, { wins, appearances }]) => ({
        name,
        wins,
        appearances,
        winRate: Math.round((wins / appearances) * 100),
      }))
      .sort(sort)

    const commanders = Object.entries(commanderMap)
      .map(([commanderName, { commanderColors, wins, appearances }]) => ({
        commanderName,
        commanderColors,
        wins,
        appearances,
        winRate: Math.round((wins / appearances) * 100),
      }))
      .sort(sort)

    return NextResponse.json({ players, commanders })
  } catch (error) {
    console.error('GET /api/games/stats/leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard stats' }, { status: 500 })
  }
}
