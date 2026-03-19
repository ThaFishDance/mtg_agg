import { useState, useEffect, useRef } from 'react'

export default function CommanderInput({ value, onSelect }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cards/autocomplete?query=${encodeURIComponent(value)}`)
        const names = await res.json()
        setSuggestions(names.slice(0, 8))
        setHighlighted(0)
        setOpen(names.length > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function select(name) {
    onSelect({ name, colorIdentity: [] })
    setOpen(false)
    setSuggestions([])
    try {
      const res = await fetch(`/api/cards/lookup?query=${encodeURIComponent(name)}`)
      if (res.ok) {
        const card = await res.json()
        onSelect({ name: card.name, colorIdentity: card.colorIdentity ?? [] })
      }
    } catch {
      // leave colors empty if lookup fails
    }
  }

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
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
      <label className="block text-xs mb-1" style={{ color: isEmpty ? '#e05c3a' : '#9ca3af' }}>
        Commander Name <span style={{ color: '#e05c3a' }}>*</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onSelect({ name: e.target.value, colorIdentity: [] })}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{
          backgroundColor: '#161b22',
          border: `1px solid ${isEmpty ? '#e05c3a55' : '#374151'}`,
          color: 'white',
        }}
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden text-sm"
          style={{ backgroundColor: '#1c2230', border: '1px solid #374151', boxShadow: '0 8px 24px #00000088' }}
        >
          {suggestions.map((name, i) => (
            <li
              key={name}
              onMouseDown={() => select(name)}
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
