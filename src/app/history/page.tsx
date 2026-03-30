'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ColorStats from '@/components/ColorStats'

interface GamePlayer {
  id: number
  player_name: string
  commander_name: string | null
  commander_colors: string[]
  final_life: number | null
  final_poison: number
  eliminated: boolean
}

interface Game {
  id: number
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
  starting_life: number
  winner_name: string | null
  player_count: number
  players: GamePlayer[]
}

const MANA_COLORS: Record<string, string> = {
  W: '#f5f0dc',
  U: '#4a90d9',
  B: '#a29cad',
  R: '#e05c3a',
  G: '#3a9e5c',
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}m ${s}s`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, Game>>({})

  useEffect(() => {
    fetch('/api/games')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch games (${r.status})`)
        return r.json()
      })
      .then((data) => {
        setGames(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  async function toggleExpand(gameId: number) {
    if (expandedId === gameId) {
      setExpandedId(null)
      return
    }
    setExpandedId(gameId)
    if (!details[gameId]) {
      try {
        const res = await fetch(`/api/games/${gameId}`)
        const data = await res.json()
        setDetails((prev) => ({ ...prev, [gameId]: data }))
      } catch (err) {
        console.error('Failed to load game details:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading history...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div style={{ color: '#e05c3a' }}>Error: {error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-cinzel text-3xl font-bold mb-2" style={{ color: '#c9a84c' }}>
          Game History
        </h2>
        <p className="text-gray-400">Past battles and their outcomes</p>
      </div>

      <ColorStats />

      {games.length === 0 ? (
        <div
          className="text-center py-20 rounded-2xl"
          style={{ backgroundColor: '#1c2230' }}
        >
          <div className="text-6xl mb-4">⚔️</div>
          <div className="text-gray-400 text-lg mb-4">No games recorded yet</div>
          <Link
            href="/setup"
            className="px-6 py-2 rounded-lg font-semibold inline-block"
            style={{ backgroundColor: '#c9a84c', color: '#0d1117' }}
          >
            Start a Game
          </Link>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid #374151' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#161b22' }}>
                {['Date', 'Players', 'Winner', 'Duration', 'Starting Life', ''].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {games.map((game, idx) => (
                <>
                  <tr
                    key={game.id}
                    className="cursor-pointer transition-all"
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#1c2230' : '#18202e',
                      borderTop: '1px solid #37415133',
                    }}
                    onClick={() => toggleExpand(game.id)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDate(game.started_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(game.players || []).map((p, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#374151', color: '#d1d5db' }}
                          >
                            {p.player_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-sm" style={{ color: '#c9a84c' }}>
                        {game.winner_name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDuration(game.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {game.starting_life}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {expandedId === game.id ? '▲' : '▼'}
                    </td>
                  </tr>

                  {expandedId === game.id && (
                    <tr key={`${game.id}-detail`} style={{ backgroundColor: '#161b22' }}>
                      <td colSpan={6} className="px-4 py-4">
                        {details[game.id] ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {details[game.id].players.map((p) => (
                              <div
                                key={p.id}
                                className="rounded-lg p-3 space-y-1"
                                style={{ backgroundColor: '#1c2230' }}
                              >
                                <div className="font-semibold text-sm text-white">
                                  {p.player_name}
                                </div>
                                {p.commander_name && (
                                  <div className="text-xs" style={{ color: '#c9a84c' }}>
                                    {p.commander_name}
                                  </div>
                                )}
                                {p.commander_colors?.length > 0 && (
                                  <div className="flex gap-1">
                                    {p.commander_colors.map((c) => (
                                      <div
                                        key={c}
                                        className="w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                                        style={{
                                          backgroundColor: MANA_COLORS[c] || '#374151',
                                          color: c === 'W' ? '#1a1a1a' : '#fff',
                                          fontSize: '9px',
                                        }}
                                      >
                                        {c}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex gap-3 text-xs text-gray-400 pt-1">
                                  <span>❤ {p.final_life}</span>
                                  {p.final_poison > 0 && (
                                    <span style={{ color: '#a78bfa' }}>
                                      ☠ {p.final_poison}
                                    </span>
                                  )}
                                  {p.eliminated && (
                                    <span style={{ color: '#e05c3a' }}>Eliminated</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">Loading details...</div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
