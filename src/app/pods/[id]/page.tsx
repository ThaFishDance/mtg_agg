'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Member {
  userId: string
  name: string | null
  email: string | null
  role: 'OWNER' | 'MEMBER'
  joinedAt: string
}

interface Game {
  id: number
  started_at: string
  completed_at: string | null
  winner_name: string | null
  player_count: number
  duration_seconds: number | null
  players: { player_name: string; commander_name: string | null }[]
}

interface PodDetail {
  id: string
  name: string
  description: string | null
  inviteCode: string
  creatorId: string
  myRole: 'OWNER' | 'MEMBER'
  members: Member[]
}

export default function PodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: podId } = use(params)
  const router = useRouter()

  const [pod, setPod] = useState<PodDetail | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const [editWinner, setEditWinner] = useState<{ gameId: number; current: string } | null>(null)
  const [editWinnerValue, setEditWinnerValue] = useState('')
  const [savingWinner, setSavingWinner] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/pods/${podId}`).then((r) => r.json()),
      fetch(`/api/games?podId=${podId}`).then((r) => r.json()),
    ]).then(([podData, gamesData]) => {
      setPod(podData)
      setGames(Array.isArray(gamesData) ? gamesData : [])
    }).finally(() => setLoading(false))
  }, [podId])

  function copyInviteCode() {
    if (!pod) return
    navigator.clipboard.writeText(pod.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member from the pod?')) return
    const res = await fetch(`/api/pods/${podId}/members/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setPod((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.userId !== userId) } : prev)
    }
  }

  async function deleteGame(gameId: number) {
    if (!confirm('Delete this game permanently?')) return
    const res = await fetch(`/api/games/${gameId}`, { method: 'DELETE' })
    if (res.ok) {
      setGames((prev) => prev.filter((g) => g.id !== gameId))
    }
  }

  async function saveWinner() {
    if (!editWinner) return
    setSavingWinner(true)
    const res = await fetch(`/api/games/${editWinner.gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerName: editWinnerValue }),
    })
    setSavingWinner(false)
    if (res.ok) {
      setGames((prev) =>
        prev.map((g) => g.id === editWinner.gameId ? { ...g, winner_name: editWinnerValue } : g)
      )
      setEditWinner(null)
    }
  }

  async function deletePod() {
    if (!confirm('Delete this pod? All associated games will also be deleted.')) return
    const res = await fetch(`/api/pods/${podId}`, { method: 'DELETE' })
    if (res.ok) router.push('/pods')
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="h-8 w-48 rounded bg-white/10 animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!pod) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center" style={{ color: '#9ca3af' }}>
        Pod not found.
      </div>
    )
  }

  const isOwner = pod.myRole === 'OWNER'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/pods" className="text-sm mb-2 block" style={{ color: '#9ca3af' }}>
            ← My Pods
          </Link>
          <h1 className="font-cinzel text-3xl font-bold" style={{ color: '#c9a84c' }}>
            {pod.name}
          </h1>
          {pod.description && (
            <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>{pod.description}</p>
          )}
        </div>
        {isOwner && (
          <div className="flex gap-2 ml-4 shrink-0">
            <Link
              href={`/pods/${podId}/edit`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ border: '1px solid #c9a84c44', color: '#c9a84c' }}
            >
              Edit
            </Link>
            <button
              onClick={deletePod}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ border: '1px solid #e05c3a44', color: '#e05c3a' }}
            >
              Delete Pod
            </button>
          </div>
        )}
      </div>

      {/* Invite code */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#1c2230' }}>
        <h2 className="font-cinzel font-semibold mb-3" style={{ color: '#c9a84c' }}>Invite Code</h2>
        <div className="flex items-center gap-3">
          <code
            className="flex-1 px-4 py-2 rounded-lg text-lg font-mono tracking-widest text-center"
            style={{ backgroundColor: '#0d1117', color: '#c9a84c', border: '1px solid #c9a84c44' }}
          >
            {pod.inviteCode}
          </code>
          <button
            onClick={copyInviteCode}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ backgroundColor: '#c9a84c', color: '#0d1117' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#1c2230' }}>
        <h2 className="font-cinzel font-semibold mb-4" style={{ color: '#c9a84c' }}>
          Members ({pod.members.length})
        </h2>
        <div className="space-y-2">
          {pod.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between py-2">
              <div>
                <span className="font-medium text-white">{m.name ?? m.email}</span>
                {m.name && (
                  <span className="ml-2 text-sm" style={{ color: '#9ca3af' }}>{m.email}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={
                    m.role === 'OWNER'
                      ? { backgroundColor: '#c9a84c33', color: '#c9a84c' }
                      : { backgroundColor: '#374151', color: '#9ca3af' }
                  }
                >
                  {m.role}
                </span>
                {isOwner && m.role !== 'OWNER' && (
                  <button
                    onClick={() => removeMember(m.userId)}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ color: '#e05c3a' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game history */}
      <div>
        <h2 className="font-cinzel font-semibold mb-4 text-xl" style={{ color: '#c9a84c' }}>
          Game History
        </h2>
        {games.length === 0 ? (
          <p className="text-center py-6" style={{ color: '#9ca3af' }}>
            No games recorded yet.{' '}
            <Link href="/setup" style={{ color: '#c9a84c' }}>Start one!</Link>
          </p>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <div
                key={game.id}
                className="rounded-xl p-4"
                style={{ backgroundColor: '#1c2230', border: '1px solid #c9a84c22' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">
                        {game.winner_name ? `🏆 ${game.winner_name}` : 'No winner recorded'}
                      </span>
                      <span className="text-xs" style={{ color: '#9ca3af' }}>
                        {new Date(game.started_at).toLocaleDateString()} · {formatDuration(game.duration_seconds)} · {game.player_count} players
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                      {game.players.map((p) => p.player_name).join(', ')}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex gap-2 ml-3 shrink-0">
                      <button
                        onClick={() => {
                          setEditWinner({ gameId: game.id, current: game.winner_name ?? '' })
                          setEditWinnerValue(game.winner_name ?? '')
                        }}
                        className="text-xs px-2 py-1 rounded"
                        style={{ border: '1px solid #c9a84c44', color: '#c9a84c' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteGame(game.id)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ border: '1px solid #e05c3a44', color: '#e05c3a' }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {editWinner?.gameId === game.id && (
                  <div className="mt-3 flex gap-2 items-center">
                    <input
                      type="text"
                      value={editWinnerValue}
                      onChange={(e) => setEditWinnerValue(e.target.value)}
                      placeholder="Winner name"
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-[#0d1117] text-white outline-none"
                      style={{ border: '1px solid #c9a84c44' }}
                    />
                    <button
                      onClick={saveWinner}
                      disabled={savingWinner || !editWinnerValue.trim()}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                      style={{ backgroundColor: '#c9a84c', color: '#0d1117' }}
                    >
                      {savingWinner ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditWinner(null)}
                      className="px-3 py-1.5 rounded-lg text-sm"
                      style={{ color: '#9ca3af' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
