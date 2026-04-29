'use client'

import { useState, useMemo } from 'react'

interface ParsedCard {
  cardName: string
  category: 'commander' | 'mainboard'
}

function parseDeckList(text: string): ParsedCard[] {
  let currentCategory: 'commander' | 'mainboard' | 'sideboard' = 'mainboard'
  const cards: ParsedCard[] = []

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('//') || line.startsWith('#')) continue

    if (/^commander$/i.test(line)) { currentCategory = 'commander'; continue }
    if (/^sideboard$/i.test(line)) { currentCategory = 'sideboard'; continue }
    if (/^(deck|mainboard|creatures|lands|spells|instants|sorceries|artifacts|enchantments)/i.test(line)) {
      currentCategory = 'mainboard'; continue
    }

    // Match: "1x Sol Ring (CMR) 123" or "2 Island" or "1 Atraxa, Praetors' Voice"
    const match = line.match(/^(\d+)[xX]?\s+(.+?)(?:\s+\([^)]+\)(?:\s+\d+)?)?$/)
    if (!match) continue

    const quantity = Math.min(parseInt(match[1], 10), 99)
    const cardName = match[2].trim()
    if (!cardName || currentCategory === 'sideboard') continue

    const category = currentCategory === 'commander' ? 'commander' : 'mainboard'
    for (let i = 0; i < quantity; i++) {
      cards.push({ cardName, category })
    }
  }

  return cards
}

interface DeckImportModalProps {
  deckId: number
  onClose: () => void
  onImported: (count: number) => void
}

export default function DeckImportModal({ deckId, onClose, onImported }: DeckImportModalProps) {
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = useMemo(() => parseDeckList(text), [text])

  async function handleImport() {
    if (parsed.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch(`/api/decks/${deckId}/cards/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: parsed }),
      })
      if (!res.ok) throw new Error('Import failed')
      const { added } = await res.json()
      onImported(added)
    } catch {
      setError('Failed to import cards. Please try again.')
      setImporting(false)
    }
  }

  const commanderCount = parsed.filter((c) => c.category === 'commander').length
  const mainboardCount = parsed.filter((c) => c.category === 'mainboard').length

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: '#000000bb' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-lg space-y-4"
        style={{ backgroundColor: '#1c2230', border: '1px solid #374151' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-cinzel text-xl font-bold" style={{ color: '#c9a84c' }}>
            Import Decklist
          </h2>
          <button
            onClick={onClose}
            className="text-lg leading-none"
            style={{ color: '#8b949e' }}
          >
            ×
          </button>
        </div>

        <p className="text-xs" style={{ color: '#8b949e' }}>
          Paste a decklist in MTGA, Moxfield, or plain text format. Lines like{' '}
          <span style={{ color: '#e6edf3' }}>1x Sol Ring</span> or{' '}
          <span style={{ color: '#e6edf3' }}>1 Sol Ring (CMR) 322</span> are supported.
          A &quot;Commander&quot; section header sets the category; &quot;Sideboard&quot; cards are skipped.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\n2 Island"}
          rows={12}
          className="w-full rounded-lg px-3 py-2 text-sm font-mono resize-none"
          style={{
            backgroundColor: '#161b22',
            border: '1px solid #374151',
            color: 'white',
          }}
          disabled={importing}
        />

        {text.trim() && (
          <div className="text-xs space-x-3" style={{ color: '#8b949e' }}>
            <span style={{ color: parsed.length > 0 ? '#c9a84c' : '#e05c3a' }}>
              {parsed.length} card{parsed.length !== 1 ? 's' : ''} parsed
            </span>
            {commanderCount > 0 && <span>{commanderCount} commander</span>}
            {mainboardCount > 0 && <span>{mainboardCount} mainboard</span>}
          </div>
        )}

        {error && (
          <p className="text-sm" style={{ color: '#e05c3a' }}>{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onClose}
            disabled={importing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={handleImport}
            disabled={importing || parsed.length === 0}
            style={{ opacity: importing || parsed.length === 0 ? 0.7 : 1 }}
          >
            {importing ? 'Importing...' : `Import ${parsed.length > 0 ? parsed.length : ''} Cards`}
          </button>
        </div>
      </div>
    </div>
  )
}
