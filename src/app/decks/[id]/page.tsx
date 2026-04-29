'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DeckCardSearch from '@/components/DeckCardSearch'
import DeckCardList from '@/components/DeckCardList'
import DeckStats from '@/components/DeckStats'
import DeckImportModal from '@/components/DeckImportModal'

interface DeckCard {
  id: number
  card_name: string
  quantity: number
  category: string
}

interface Deck {
  id: number
  name: string
  commander_name: string | null
  commander_colors: string[]
  cards: DeckCard[]
}

export default function DeckPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    fetch(`/api/decks/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Deck not found')
        return r.json()
      })
      .then(setDeck)
      .catch(() => setError('Failed to load deck'))
      .finally(() => setLoading(false))
  }, [id])

  const handleCardAdded = useCallback((card: DeckCard) => {
    setDeck((prev) => prev ? { ...prev, cards: [...prev.cards, card] } : prev)
  }, [])

  const handleImported = useCallback(() => {
    setShowImport(false)
    fetch(`/api/decks/${id}`)
      .then((r) => r.json())
      .then(setDeck)
      .catch(() => {})
  }, [id])

  const handleRemove = useCallback(async (cardId: number) => {
    setDeck((prev) => prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) } : prev)
    try {
      await fetch(`/api/decks/${id}/cards/${cardId}`, { method: 'DELETE' })
    } catch {
      // silently fail; state already updated optimistically
    }
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/decks/${id}`, { method: 'DELETE' })
      router.push('/decks')
    } catch {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
        <p className="text-center py-16" style={{ color: '#8b949e' }}>Loading deck...</p>
      </main>
    )
  }

  if (error || !deck) {
    return (
      <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
        <p className="text-center py-16" style={{ color: '#e05c3a' }}>{error ?? 'Deck not found'}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cinzel text-3xl font-bold" style={{ color: '#c9a84c' }}>
            {deck.name}
          </h1>
          {deck.commander_name && (
            <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
              Commander: {deck.commander_name}
            </p>
          )}
        </div>
        <button
          className="btn-danger shrink-0"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#1c2230', border: '1px solid #374151' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: '#9ca3af' }}>ADD CARD</p>
              <button
                className="text-xs"
                style={{ color: '#c9a84c' }}
                onClick={() => setShowImport(true)}
              >
                Import List
              </button>
            </div>
            <DeckCardSearch deckId={deck.id} onCardAdded={handleCardAdded} />
          </div>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#1c2230', border: '1px solid #374151' }}
          >
            <DeckCardList cards={deck.cards} commanderName={deck.commander_name} onRemove={handleRemove} />
          </div>
        </div>

        <div className="space-y-4">
          <DeckStats cards={deck.cards} commanderColors={deck.commander_colors} commanderName={deck.commander_name} />
        </div>
      </div>

      {showImport && (
        <DeckImportModal
          deckId={deck.id}
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: '#000000bb' }}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full space-y-4"
            style={{ backgroundColor: '#1c2230', border: '1px solid #374151' }}
          >
            <h2 className="font-cinzel text-xl font-bold" style={{ color: '#e6edf3' }}>
              Delete Deck?
            </h2>
            <p className="text-sm" style={{ color: '#8b949e' }}>
              This will permanently delete &quot;{deck.name}&quot; and all its cards.
            </p>
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn-danger flex-1"
                onClick={handleDelete}
                disabled={deleting}
                style={{ opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
