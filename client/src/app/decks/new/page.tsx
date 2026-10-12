'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CommanderInput from '@/components/CommanderInput'

export default function NewDeckPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [commanderName, setCommanderName] = useState('')
  const [commanderColors, setCommanderColors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), commanderName: commanderName || undefined, commanderColors }),
      })
      if (!res.ok) throw new Error('Failed to create deck')
      const { id } = await res.json()
      router.push(`/decks/${id}`)
    } catch {
      setError('Failed to create deck. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <h1 className="font-cinzel text-3xl font-bold mb-8" style={{ color: '#c9a84c' }}>
        New Deck
      </h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: '#1c2230', border: '1px solid #374151' }}
      >
        <div>
          <label className="block text-xs mb-1" style={{ color: !name.trim() ? '#e05c3a' : '#9ca3af' }}>
            Deck Name <span style={{ color: '#e05c3a' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Atraxa Superfriends"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: '#161b22',
              border: `1px solid ${!name.trim() ? '#e05c3a55' : '#374151'}`,
              color: 'white',
            }}
          />
        </div>

        <CommanderInput
          value={commanderName}
          onSelect={({ name: n, colorIdentity }) => {
            setCommanderName(n)
            setCommanderColors(colorIdentity)
          }}
        />

        {error && (
          <p className="text-sm" style={{ color: '#e05c3a' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={loading || !name.trim()}
            style={{ opacity: loading || !name.trim() ? 0.7 : 1 }}
          >
            {loading ? 'Creating...' : 'Create Deck'}
          </button>
        </div>
      </form>
    </main>
  )
}
