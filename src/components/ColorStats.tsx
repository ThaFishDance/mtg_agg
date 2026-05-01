'use client'

import { useState, useEffect } from 'react'
import ManaPip from '@/components/ManaPip'

interface ColorData {
  color: string
  wins: number
  appearances: number
  winRate: number
}

interface CombData {
  colors: string[]
  wins: number
  appearances: number
  winRate: number
}

interface ColorStatsData {
  totalGames: number
  colors: ColorData[]
  combinations: CombData[]
}

const MANA_COLORS: Record<string, { hex: string; name: string }> = {
  W: { hex: '#f5f0dc', name: 'White' },
  U: { hex: '#4a90d9', name: 'Blue' },
  B: { hex: '#a29cad', name: 'Black' },
  R: { hex: '#e05c3a', name: 'Red' },
  G: { hex: '#3a9e5c', name: 'Green' },
}

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G']

function winRateColor(rate: number) {
  if (rate >= 50) return '#3a9e5c'
  if (rate > 0) return '#c9a84c'
  return '#4b5563'
}

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

  const maxColorWins = Math.max(...colorRows.map((c) => c.wins), 1)
  const maxCombWins = Math.max(...(stats.combinations ?? []).map((c) => c.wins), 1)

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

      {/* Individual colors */}
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
                  width: `${(wins / maxColorWins) * 100}%`,
                  backgroundColor: hex,
                  opacity: appearances > 0 ? 1 : 0,
                }}
              />
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 text-right">
              <span className="text-sm w-14" style={{ color: '#8b949e' }}>
                {appearances > 0 ? `${wins}W / ${appearances}` : '—'}
              </span>
              <span className="text-sm font-semibold w-12" style={{ color: winRateColor(winRate) }}>
                {appearances > 0 ? `${winRate}%` : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Color identity combinations */}
      {stats.combinations?.length > 0 && (
        <>
          <div
            className="my-5 border-t"
            style={{ borderColor: '#c9a84c22' }}
          />
          <div className="flex items-baseline justify-between mb-4">
            <h4 className="font-cinzel font-semibold text-sm" style={{ color: '#c9a84c' }}>
              By Color Identity
            </h4>
            <span className="text-xs" style={{ color: '#4b5563' }}>
              {stats.combinations.length} unique {stats.combinations.length === 1 ? 'identity' : 'identities'}
            </span>
          </div>
          <div className="space-y-3">
            {stats.combinations.map((comb) => {
              const key = comb.colors.length === 0 ? 'C' : comb.colors.join('')
              const pips = comb.colors.length === 0 ? ['C'] : comb.colors
              const barColor = comb.colors.length === 1
                ? MANA_COLORS[comb.colors[0]]?.hex ?? '#c9a84c'
                : '#c9a84c'
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex gap-0.5 flex-shrink-0" style={{ minWidth: '72px' }}>
                    {pips.map((c) => (
                      <ManaPip key={c} color={c} size={22} />
                    ))}
                  </div>
                  <div
                    className="flex-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#0d1117', height: '8px' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(comb.wins / maxCombWins) * 100}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <span className="text-sm w-14" style={{ color: '#8b949e' }}>
                      {comb.wins}W / {comb.appearances}
                    </span>
                    <span className="text-sm font-semibold w-12" style={{ color: winRateColor(comb.winRate) }}>
                      {comb.winRate}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <p className="text-xs mt-4" style={{ color: '#4b5563' }}>
        Win rate = wins ÷ appearances. Individual colors count each color in a commander&apos;s identity separately.
      </p>
    </div>
  )
}
