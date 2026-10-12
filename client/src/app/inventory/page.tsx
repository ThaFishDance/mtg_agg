'use client'

import { useEffect, useRef, useState } from 'react'
import PrintSelectionModal, { type SelectedPrint } from '@/components/PrintSelectionModal'
import ManaPip from '@/components/ManaPip'

const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'] as const
type Condition = (typeof CONDITIONS)[number]

interface InventoryCard {
  id: number
  card_name: string
  quantity: number
  foil: boolean
  condition: Condition
  updated_at: string
  scryfall_id?: string
  set_code?: string
  set_name?: string
  collector_number?: string
  image_url?: string
  color_identity?: string[]
  price?: number
  price_foil?: number
}

interface AddForm {
  cardName: string
  quantity: number
  foil: boolean
  condition: Condition
}

interface EditState {
  id: number
  quantity: number
  foil: boolean
  condition: Condition
}

const conditionLabel: Record<Condition, string> = {
  NM: 'Near Mint',
  LP: 'Lightly Played',
  MP: 'Moderately Played',
  HP: 'Heavily Played',
  DMG: 'Damaged',
}

const EMPTY_FORM: AddForm = { cardName: '', quantity: 1, foil: false, condition: 'NM' }

export default function InventoryPage() {
  const [cards, setCards] = useState<InventoryCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<AddForm>(EMPTY_FORM)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [pendingForm, setPendingForm] = useState<AddForm | null>(null)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    fetch('/api/inventory')
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(setCards)
      .catch(() => setError('Failed to load inventory'))
      .finally(() => setLoading(false))
  }, [])

  function selectSuggestion(name: string) {
    setForm((f) => ({ ...f, cardName: name }))
    setSuggestions([])
    setOpen(false)
  }

  function handleNameChange(value: string) {
    setForm((f) => ({ ...f, cardName: value }))
    setSuggestions([])
    setOpen(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 4) return
    debounceRef.current = setTimeout(() => {
      fetch(`/api/cards/autocomplete?query=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((names: string[]) => {
          setSuggestions(names)
          setHighlighted(0)
          setOpen(names.length > 0)
        })
        .catch(() => setSuggestions([]))
    }, 300)
  }

  function handleSuggestionsKeyDown(e: React.KeyboardEvent) {
    if (open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlighted((h) => Math.max(h - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (suggestions[highlighted]) selectSuggestion(suggestions[highlighted])
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    } else if (e.key === 'Enter') {
      handleAdd()
    }
  }

  function handleAdd() {
    if (!form.cardName.trim()) { setAddError('Card name is required'); return }
    setAddError(null)
    setPendingForm({ ...form })
    setPrintModalOpen(true)
  }

  async function handlePrintSelect(print: SelectedPrint) {
    if (!pendingForm) return
    setPrintModalOpen(false)
    setAdding(true)
    setAddError(null)
    try {
      const r = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardName: pendingForm.cardName.trim(),
          quantity: pendingForm.quantity,
          foil: pendingForm.foil,
          condition: pendingForm.condition,
          scryfallId: print.scryfallId,
          setCode: print.setCode,
          setName: print.setName,
          collectorNumber: print.collectorNumber,
          imageUrl: print.imageUrl,
          colorIdentity: print.colorIdentity,
          price: print.price,
          priceFoil: print.priceFoil,
        }),
      })
      if (!r.ok) { setAddError('Failed to add card'); return }
      const card = await r.json()
      setCards((prev) => [...prev, card].sort((a, b) => a.card_name.localeCompare(b.card_name)))
      setForm(EMPTY_FORM)
      setSuggestions([])
      setPendingForm(null)
    } catch {
      setAddError('Failed to add card')
    } finally {
      setAdding(false)
    }
  }

  async function handleSaveEdit(id: number) {
    if (!editState) return
    try {
      const r = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: editState.quantity, foil: editState.foil, condition: editState.condition }),
      })
      if (!r.ok) return
      const updated = await r.json()
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)))
      setEditState(null)
    } catch { /* no-op */ }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  const filtered = cards.filter((c) =>
    c.card_name.toLowerCase().includes(search.toLowerCase())
  )

  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0)
  const totalValue = cards.reduce((sum, c) => {
    const p = c.foil ? (c.price_foil ?? c.price ?? 0) : (c.price ?? 0)
    return sum + p * c.quantity
  }, 0)

  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cinzel text-3xl font-bold" style={{ color: '#c9a84c' }}>
            My Inventory
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
            {cards.length} unique card{cards.length !== 1 ? 's' : ''} · {totalCards} total
            {totalValue > 0 && ` · $${totalValue.toFixed(2)} est. value`}
          </p>
        </div>
      </div>

      <div
          className="rounded-xl p-5 mb-6"
          style={{ backgroundColor: '#1c2230', border: '1px solid #374151' }}
        >
          <h2 className="font-cinzel font-bold mb-4" style={{ color: '#c9a84c' }}>Add Card</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div ref={containerRef} className="relative sm:col-span-2">
              <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>Card Name</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: '#0d1117', border: '1px solid #374151', color: '#e6edf3' }}
                placeholder="Search for a card..."
                value={form.cardName}
                autoComplete="off"
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={handleSuggestionsKeyDown}
                onFocus={() => suggestions.length > 0 && setOpen(true)}
              />
              {open && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden text-sm shadow-[0_8px_24px_#00000088]"
                  style={{ backgroundColor: '#161b22', border: '1px solid #374151' }}
                >
                  {suggestions.map((s, i) => (
                    <li
                      key={s}
                      onMouseDown={() => selectSuggestion(s)}
                      onMouseEnter={() => setHighlighted(i)}
                      className={`px-3 py-2 cursor-pointer transition-colors border-l-2 ${
                        i === highlighted
                          ? 'bg-gold/13 text-gold border-l-gold'
                          : 'bg-transparent text-[#e6edf3] border-l-transparent'
                      }`}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>Quantity</label>
              <input
                type="number"
                min={1}
                max={9999}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: '#0d1117', border: '1px solid #374151', color: '#e6edf3' }}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>Condition</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: '#0d1117', border: '1px solid #374151', color: '#e6edf3' }}
                value={form.condition}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as Condition }))}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c} — {conditionLabel[c]}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="foil-add"
                checked={form.foil}
                onChange={(e) => setForm((f) => ({ ...f, foil: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="foil-add" className="text-sm" style={{ color: '#e6edf3' }}>Foil</label>
            </div>
          </div>

          {addError && <p className="text-sm mt-3" style={{ color: '#e05c3a' }}>{addError}</p>}

          <div className="flex gap-3 mt-4">
            <button className="btn-primary" onClick={handleAdd} disabled={adding}>
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>

      <input
        className="w-full rounded-lg px-3 py-2 text-sm mb-4"
        style={{ backgroundColor: '#1c2230', border: '1px solid #374151', color: '#e6edf3' }}
        placeholder="Search inventory..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="text-center py-16" style={{ color: '#8b949e' }}>Loading inventory...</p>}
      {error && <p className="text-center py-16" style={{ color: '#e05c3a' }}>{error}</p>}

      {!loading && !error && cards.length === 0 && (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ backgroundColor: '#1c2230', border: '1px solid #374151' }}
        >
          <p className="text-lg mb-2" style={{ color: '#e6edf3' }}>No cards yet</p>
          <p className="text-sm" style={{ color: '#8b949e' }}>Add cards above to start tracking your collection.</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && cards.length > 0 && (
        <p className="text-center py-8" style={{ color: '#8b949e' }}>No cards match &quot;{search}&quot;</p>
      )}

      {filtered.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #374151' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#161b22', borderBottom: '1px solid #374151' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: '#8b949e' }}>Card</th>
                <th className="text-center px-4 py-3 font-medium hidden sm:table-cell" style={{ color: '#8b949e' }}>Mana</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: '#8b949e' }}>Qty</th>
                <th className="text-center px-4 py-3 font-medium hidden sm:table-cell" style={{ color: '#8b949e' }}>Foil</th>
                <th className="text-center px-4 py-3 font-medium hidden sm:table-cell" style={{ color: '#8b949e' }}>Condition</th>
                <th className="text-center px-4 py-3 font-medium hidden md:table-cell" style={{ color: '#8b949e' }}>Price</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((card, i) => {
                const editing = editState?.id === card.id
                return (
                  <tr
                    key={card.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? '#1c2230' : '#161b22',
                      borderBottom: '1px solid #374151',
                    }}
                  >
                    <td className="px-4 py-3" style={{ color: '#e6edf3' }}>
                      <span className="font-medium">{card.card_name}</span>
                      {card.set_name && (
                        <span className="block text-xs mt-0.5" style={{ color: '#8b949e' }}>
                          {card.set_name} #{card.collector_number}
                        </span>
                      )}
                      <span className="sm:hidden text-xs ml-2" style={{ color: '#8b949e' }}>
                        {card.foil ? '✦ ' : ''}{card.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {card.color_identity && card.color_identity.length > 0 ? (
                        <div className="flex items-center justify-center gap-0.5">
                          {card.color_identity.map((c) => (
                            <ManaPip key={c} color={c} size={18} />
                          ))}
                        </div>
                      ) : (
                        <span className="block text-center text-xs" style={{ color: '#8b949e' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editing ? (
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          className="w-16 rounded px-2 py-1 text-center text-sm"
                          style={{ backgroundColor: '#0d1117', border: '1px solid #374151', color: '#e6edf3' }}
                          value={editState.quantity}
                          onChange={(e) => setEditState((s) => s && ({ ...s, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                        />
                      ) : (
                        <span style={{ color: '#e6edf3' }}>{card.quantity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {editing ? (
                        <input
                          type="checkbox"
                          checked={editState.foil}
                          onChange={(e) => setEditState((s) => s && ({ ...s, foil: e.target.checked }))}
                        />
                      ) : (
                        <span style={{ color: card.foil ? '#c9a84c' : '#8b949e' }}>
                          {card.foil ? '✦' : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {editing ? (
                        <select
                          className="rounded px-2 py-1 text-sm"
                          style={{ backgroundColor: '#0d1117', border: '1px solid #374151', color: '#e6edf3' }}
                          value={editState.condition}
                          onChange={(e) => setEditState((s) => s && ({ ...s, condition: e.target.value as Condition }))}
                        >
                          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: '#c9a84c22', color: '#c9a84c' }}
                        >
                          {card.condition}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {(() => {
                        const displayPrice = card.foil ? (card.price_foil ?? card.price) : card.price
                        return displayPrice != null ? (
                          <span className="text-sm" style={{ color: '#c9a84c' }}>
                            ${displayPrice.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#8b949e' }}>—</span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editing ? (
                          <>
                            <button
                              className="text-xs px-2 py-1 rounded"
                              style={{ backgroundColor: '#c9a84c', color: '#0d1117' }}
                              onClick={() => handleSaveEdit(card.id)}
                            >
                              Save
                            </button>
                            <button
                              className="text-xs px-2 py-1 rounded"
                              style={{ backgroundColor: '#374151', color: '#e6edf3' }}
                              onClick={() => setEditState(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="text-xs px-2 py-1 rounded"
                              style={{ backgroundColor: '#374151', color: '#e6edf3' }}
                              onClick={() => setEditState({ id: card.id, quantity: card.quantity, foil: card.foil, condition: card.condition })}
                            >
                              Edit
                            </button>
                            <button
                              className="text-xs px-2 py-1 rounded"
                              style={{ backgroundColor: '#3d1515', color: '#e05c3a' }}
                              onClick={() => handleDelete(card.id)}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {printModalOpen && pendingForm && (
        <PrintSelectionModal
          cardName={pendingForm.cardName}
          onSelect={handlePrintSelect}
          onClose={() => { setPrintModalOpen(false); setPendingForm(null) }}
        />
      )}
    </main>
  )
}
