'use client'

import { useState, useEffect } from 'react'
import ManaPip from '@/components/ManaPip'

interface PlayerEntry {
  name: string
  wins: number
  appearances: number
  winRate: number
}

interface CommanderEntry {
  commanderName: string
  commanderColors: string[]
  wins: number
  appearances: number
  winRate: number
}

interface LeaderboardData {
  players: PlayerEntry[]
  commanders: CommanderEntry[]
}

function winRateColor(rate: number) {
  if (rate >= 50) return '#3a9e5c'
  if (rate > 0) return '#c9a84c'
  return '#4b5563'
}

export default function Leaderboards() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/games/stats/leaderboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return null
  if (!data || (data.players.length === 0 && data.commanders.length === 0)) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {/* Player Rankings */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: '#1c2230', border: '1px solid #c9a84c22' }}
      >
        <h3 className="font-cinzel font-semibold text-lg mb-4" style={{ color: '#c9a84c' }}>
          Player Rankings
        </h3>
        {data.players.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: '#4b5563' }}>No games recorded yet</p>
        ) : (
          <div className="space-y-0 divide-y" style={{ borderColor: '#1e293b' }}>
            {data.players.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 py-2">
                <span
                  className="text-sm font-bold w-6 flex-shrink-0 text-right"
                  style={{ color: i === 0 ? '#c9a84c' : '#4b5563' }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-sm truncate" style={{ color: '#e6edf3' }}>
                  {p.name}
                </span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm w-12 text-right" style={{ color: '#8b949e' }}>
                    {p.wins}W / {p.appearances}
                  </span>
                  <span className="text-sm font-semibold w-10 text-right" style={{ color: winRateColor(p.winRate) }}>
                    {p.winRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Commanders */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: '#1c2230', border: '1px solid #c9a84c22' }}
      >
        <h3 className="font-cinzel font-semibold text-lg mb-4" style={{ color: '#c9a84c' }}>
          Top Commanders
        </h3>
        {data.commanders.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: '#4b5563' }}>No games recorded yet</p>
        ) : (
          <div className="space-y-0 divide-y" style={{ borderColor: '#1e293b' }}>
            {data.commanders.map((c, i) => {
              const pips = c.commanderColors.length > 0 ? c.commanderColors : ['C']
              return (
                <div key={c.commanderName} className="flex items-center gap-3 py-2">
                  <span
                    className="text-sm font-bold w-6 flex-shrink-0 text-right"
                    style={{ color: i === 0 ? '#c9a84c' : '#4b5563' }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#c9a84c' }}>
                      {c.commanderName}
                    </p>
                    <div className="flex gap-0.5 mt-0.5">
                      {pips.map((pip) => (
                        <ManaPip key={pip} color={pip} size={16} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm w-12 text-right" style={{ color: '#8b949e' }}>
                      {c.wins}W / {c.appearances}
                    </span>
                    <span className="text-sm font-semibold w-10 text-right" style={{ color: winRateColor(c.winRate) }}>
                      {c.winRate}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
