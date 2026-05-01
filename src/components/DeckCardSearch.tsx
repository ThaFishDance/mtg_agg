'use client'

import { useState, useEffect, useRef } from 'react'

interface DeckCardSearchProps {
  deckId: number
  onCardAdded: (card: { id: number; card_name: string; quantity: number; category: string }) => void
}

export default function DeckCardSearch({ deckId, onCardAdded }: DeckCardSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [adding, setAdding] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 4) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cards/autocomplete?query=${encodeURIComponent(query)}`)
        const names: string[] = await res.json()
        setSuggestions(names.slice(0, 8))
        setHighlighted(0)
        setOpen(names.length > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function addCard(name: string) {
    setAdding(true)
    setOpen(false)
    setSuggestions([])
    setQuery('')
    try {
      const res = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardName: name, category: 'mainboard' }),
      })
      if (res.ok) {
        const card = await res.json()
        onCardAdded(card)
      }
    } catch {
      // silently fail
    } finally {
      setAdding(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions[highlighted]) addCard(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={adding ? 'Adding...' : 'Search for a card to add...'}
        disabled={adding}
        autoComplete="off"
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{
          backgroundColor: '#161b22',
          border: '1px solid #374151',
          color: 'white',
          opacity: adding ? 0.6 : 1,
        }}
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden text-sm"
          style={{
            backgroundColor: '#1c2230',
            border: '1px solid #374151',
            boxShadow: '0 8px 24px #00000088',
          }}
        >
          {suggestions.map((name, i) => (
            <li
              key={name}
              onMouseDown={() => addCard(name)}
              onMouseEnter={() => setHighlighted(i)}
              className="px-3 py-2 cursor-pointer transition-colors"
              style={{
                backgroundColor: i === highlighted ? '#c9a84c22' : 'transparent',
                color: i === highlighted ? '#c9a84c' : '#e6edf3',
                borderLeft: i === highlighted ? '2px solid #c9a84c' : '2px solid transparent',
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
