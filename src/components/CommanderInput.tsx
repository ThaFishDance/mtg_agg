'use client'

import { useState, useEffect, useRef } from 'react'

interface CommanderSelection {
  name: string
  colorIdentity: string[]
}

interface CommanderInputProps {
  value: string
  onSelect: (selection: CommanderSelection) => void
}

function isValidCommander(typeLine: string): boolean {
  return typeLine.includes('Legendary') && (typeLine.includes('Creature') || typeLine.includes('Planeswalker'))
}

export default function CommanderInput({ value, onSelect }: CommanderInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 4) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cards/autocomplete?query=${encodeURIComponent(value)}`)
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
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function select(name: string) {
    setError(null)
    onSelect({ name, colorIdentity: [] })
    setOpen(false)
    setSuggestions([])
    try {
      const res = await fetch(`/api/cards/lookup?query=${encodeURIComponent(name)}`)
      if (res.ok) {
        const card = await res.json()
        if (!isValidCommander(card.typeLine ?? '')) {
          setError('Commander must be a legendary creature or planeswalker.')
          onSelect({ name: '', colorIdentity: [] })
          return
        }
        onSelect({ name: card.name, colorIdentity: card.colorIdentity ?? [] })
      }
    } catch {
      // leave colors empty if lookup fails
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
      if (suggestions[highlighted]) select(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const isEmpty = !value.trim()

  return (
    <div ref={containerRef} className="relative">
      <label className={`block text-xs mb-1 ${isEmpty ? 'text-mana-r' : 'text-gray-400'}`}>
        Commander Name <span className="text-mana-r">*</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => { setError(null); onSelect({ name: e.target.value, colorIdentity: [] }) }}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        className={`w-full rounded-lg px-3 py-2 text-sm bg-secondary text-white border ${isEmpty ? 'border-mana-r/33' : 'border-gray-700'}`}
      />
      {error && (
        <p className="mt-1 text-xs text-mana-r">{error}</p>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden text-sm bg-card border border-gray-700 shadow-[0_8px_24px_#00000088]">
          {suggestions.map((name, i) => (
            <li
              key={name}
              onMouseDown={() => select(name)}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-3 py-2 cursor-pointer transition-colors border-l-2 ${
                i === highlighted
                  ? 'bg-gold/13 text-gold border-l-gold'
                  : 'bg-transparent text-[#e6edf3] border-l-transparent'
              }`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
