'use client'

import { useState, useEffect } from 'react'
import ManaPip from '@/components/ManaPip'

interface ColorData {
  color: string
  wins: number
  appearances: number
  winRate: number
}

interface ColorStatsData {
  totalGames: number
  colors: ColorData[]
}

const MANA_COLORS: Record<string, { hex: string; name: string }> = {
  W: { hex: '#f5f0dc', name: 'White' },
  U: { hex: '#4a90d9', name: 'Blue' },
  B: { hex: '#a29cad', name: 'Black' },
  R: { hex: '#e05c3a', name: 'Red' },
  G: { hex: '#3a9e5c', name: 'Green' },
}

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G']

export default function ColorStats() {
  const [stats, setStats] = useState<ColorStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/games/stats/colors')
      .then((r) => r.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return null
  if (!stats || stats.totalGames === 0) return null

  const colorRows = COLOR_ORDER.map((key) => {
    const found = stats.colors.find((c) => c.color === key)
    return {
      key,
      ...MANA_COLORS[key],
      wins: found?.wins ?? 0,
      appearances: found?.appearances ?? 0,
      winRate: found?.winRate ?? 0,
    }
  })

  const maxWins = Math.max(...colorRows.map((c) => c.wins), 1)

  return (
    <div
      className="rounded-xl p-5 mb-8"
      style={{ backgroundColor: '#1c2230', border: '1px solid #c9a84c22' }}
    >
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="font-cinzel font-semibold text-lg" style={{ color: '#c9a84c' }}>
          Color Win Rates
        </h3>
        <span className="text-xs" style={{ color: '#8b949e' }}>
          {stats.totalGames} completed {stats.totalGames === 1 ? 'game' : 'games'}
        </span>
      </div>

      <div className="space-y-3">
        {colorRows.map(({ key, hex, name, wins, appearances, winRate }) => (
          <div key={key} className="flex items-center gap-3">
            <ManaPip color={key} size={24} />

            <span
              className="w-12 text-sm flex-shrink-0"
              style={{ color: appearances > 0 ? '#e6edf3' : '#4b5563' }}
            >
              {name}
            </span>

            <div
              className="flex-1 rounded-full overflow-hidden"
              style={{ backgroundColor: '#0d1117', height: '8px' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(wins / maxWins) * 100}%`,
                  backgroundColor: hex,
                  opacity: appearances > 0 ? 1 : 0,
                }}
              />
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 text-right">
              <span className="text-sm w-14" style={{ color: '#8b949e' }}>
                {appearances > 0 ? `${wins}W / ${appearances}` : '—'}
              </span>
              <span
                className="text-sm font-semibold w-12"
                style={{
                  color:
                    winRate >= 50 ? '#3a9e5c' : winRate > 0 ? '#c9a84c' : '#4b5563',
                }}
              >
                {appearances > 0 ? `${winRate}%` : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs mt-4" style={{ color: '#4b5563' }}>
        Win rate = wins / total appearances across completed games. Multi-color commanders count toward each color.
      </p>
    </div>
  )
}
