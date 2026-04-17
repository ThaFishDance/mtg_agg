'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Pod {
  id: string
  name: string
  description: string | null
  inviteCode: string
  role: 'OWNER' | 'MEMBER'
  memberCount: number
}

export default function PodsPage() {
  const router = useRouter()
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)

  // Create pod form
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // Join pod form
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    fetch('/api/pods')
      .then((r) => r.json())
      .then(setPods)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/pods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName, description: createDesc || undefined }),
    })
    setCreating(false)
    if (res.ok) {
      const pod = await res.json()
      router.push(`/pods/${pod.id}`)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoinError('')
    setJoining(true)
    const res = await fetch('/api/pods/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: joinCode.trim() }),
    })
    setJoining(false)
    if (res.ok) {
      const pod = await res.json()
      router.push(`/pods/${pod.id}`)
    } else {
      const data = await res.json()
      setJoinError(data.error ?? 'Failed to join pod')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-cinzel text-3xl font-bold" style={{ color: '#c9a84c' }}>
          My Pods
        </h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ backgroundColor: '#c9a84c', color: '#0d1117' }}
        >
          + Create Pod
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl p-6 space-y-4"
          style={{ backgroundColor: '#1c2230', border: '1px solid #c9a84c44' }}
        >
          <h2 className="font-cinzel font-semibold" style={{ color: '#c9a84c' }}>New Pod</h2>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#9ca3af' }}>Pod Name</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
              maxLength={60}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[#0d1117] text-white outline-none"
              style={{ border: '1px solid #c9a84c44' }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#9ca3af' }}>
              Description <span className="text-xs">(optional)</span>
            </label>
            <textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              maxLength={300}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[#0d1117] text-white outline-none resize-none"
              style={{ border: '1px solid #c9a84c44' }}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: '#c9a84c', color: '#0d1117' }}
            >
              {creating ? 'Creating…' : 'Create Pod'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ color: '#9ca3af' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Join pod */}
      <form
        onSubmit={handleJoin}
        className="rounded-xl p-5"
        style={{ backgroundColor: '#1c2230' }}
      >
        <h2 className="font-cinzel font-semibold mb-3" style={{ color: '#c9a84c' }}>
          Join a Pod
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter invite code"
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#0d1117] text-white outline-none"
            style={{ border: '1px solid #c9a84c44' }}
          />
          <button
            type="submit"
            disabled={joining || !joinCode.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: '#c9a84c', color: '#0d1117' }}
          >
            {joining ? 'Joining…' : 'Join'}
          </button>
        </div>
        {joinError && <p className="mt-2 text-sm text-red-400">{joinError}</p>}
      </form>

      {/* Pod list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : pods.length === 0 ? (
        <p className="text-center py-8" style={{ color: '#9ca3af' }}>
          You have no pods yet. Create one or join with an invite code.
        </p>
      ) : (
        <div className="space-y-3">
          {pods.map((pod) => (
            <Link
              key={pod.id}
              href={`/pods/${pod.id}`}
              className="block rounded-xl p-5 transition-all hover:border-[#c9a84c88]"
              style={{ backgroundColor: '#1c2230', border: '1px solid #c9a84c22' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{pod.name}</h3>
                  {pod.description && (
                    <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                      {pod.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={
                      pod.role === 'OWNER'
                        ? { backgroundColor: '#c9a84c33', color: '#c9a84c' }
                        : { backgroundColor: '#374151', color: '#9ca3af' }
                    }
                  >
                    {pod.role}
                  </span>
                  <span className="text-sm" style={{ color: '#9ca3af' }}>
                    {pod.memberCount} {pod.memberCount === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
