'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ManaPip from '@/components/ManaPip'

interface DeckSummary {
  id: number
  name: string
  commander_name: string | null
  commander_colors: string[]
  card_count: number
  created_at: string
}

export default function DecksPage() {
  const router = useRouter()
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/decks')
      .then((r) => r.json())
      .then(setDecks)
      .catch(() => setError('Failed to load decks'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-cinzel text-3xl font-bold" style={{ color: '#c9a84c' }}>
          My Decks
        </h1>
        <button className="btn-primary" onClick={() => router.push('/decks/new')}>
          + New Deck
        </button>
      </div>

      {loading && (
        <p className="text-center py-16" style={{ color: '#8b949e' }}>
          Loading decks...
        </p>
      )}

      {error && (
        <p className="text-center py-16" style={{ color: '#e05c3a' }}>
          {error}
        </p>
      )}

      {!loading && !error && decks.length === 0 && (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ backgroundColor: '#1c2230', border: '1px solid #374151' }}
        >
          <p className="text-lg mb-2" style={{ color: '#e6edf3' }}>
            No decks yet
          </p>
          <p className="text-sm mb-6" style={{ color: '#8b949e' }}>
            Build your first Commander deck to get started.
          </p>
          <button className="btn-primary" onClick={() => router.push('/decks/new')}>
            Create a Deck
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {decks.map((deck) => (
          <button
            key={deck.id}
            onClick={() => router.push(`/decks/${deck.id}`)}
            className="text-left rounded-xl p-5 transition-all hover:scale-[1.01]"
            style={{
              backgroundColor: '#1c2230',
              border: '1px solid #374151',
              boxShadow: '0 4px 12px #00000044',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-cinzel font-bold text-lg leading-tight" style={{ color: '#e6edf3' }}>
                {deck.name}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: '#c9a84c22', color: '#c9a84c' }}
              >
                {deck.card_count} / 100
              </span>
            </div>
            {deck.commander_name && (
              <p className="text-sm mb-3" style={{ color: '#8b949e' }}>
                {deck.commander_name}
              </p>
            )}
            {deck.commander_colors.length > 0 && (
              <div className="flex gap-1">
                {deck.commander_colors.map((c) => (
                  <ManaPip key={c} color={c} size={22} />
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </main>
  )
}
