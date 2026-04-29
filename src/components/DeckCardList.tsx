'use client'

interface DeckCard {
  id: number
  card_name: string
  quantity: number
  category: string
}

interface DeckCardListProps {
  cards: DeckCard[]
  commanderName?: string | null
  onRemove: (cardId: number) => void
}

function Section({ title, cards, onRemove }: { title: string; cards: DeckCard[]; onRemove: (id: number) => void }) {
  if (cards.length === 0) return null
  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-2 px-2 py-1 mb-1 text-xs font-semibold uppercase tracking-wider rounded"
        style={{ color: '#9ca3af', backgroundColor: '#161b22' }}
      >
        <span>{title}</span>
        <span
          className="rounded-full px-2 py-0.5 text-xs"
          style={{ backgroundColor: '#c9a84c22', color: '#c9a84c' }}
        >
          {cards.length}
        </span>
      </div>
      <ul className="space-y-0.5">
        {cards.map((card) => (
          <li
            key={card.id}
            className="flex items-center justify-between px-3 py-1.5 rounded text-sm group"
            style={{ backgroundColor: '#1c2230' }}
          >
            <span style={{ color: '#e6edf3' }}>{card.card_name}</span>
            <button
              onClick={() => onRemove(card.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-xs px-1.5 py-0.5 rounded"
              style={{ color: '#e05c3a', backgroundColor: '#e05c3a22' }}
              aria-label={`Remove ${card.card_name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DeckCardList({ cards, commanderName, onRemove }: DeckCardListProps) {
  const commander = cards.filter((c) => c.category === 'commander')
  const mainboard = cards.filter((c) => c.category === 'mainboard')
  const isEmpty = cards.length === 0 && !commanderName

  if (isEmpty) {
    return (
      <p className="text-center py-8 text-sm" style={{ color: '#8b949e' }}>
        No cards yet — search above to add cards.
      </p>
    )
  }

  return (
    <div>
      {(commanderName || commander.length > 0) && (
        <div className="mb-4">
          <div
            className="flex items-center gap-2 px-2 py-1 mb-1 text-xs font-semibold uppercase tracking-wider rounded"
            style={{ color: '#9ca3af', backgroundColor: '#161b22' }}
          >
            <span>Commander</span>
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ backgroundColor: '#c9a84c22', color: '#c9a84c' }}
            >
              {commander.length + (commanderName ? 1 : 0)}
            </span>
          </div>
          <ul className="space-y-0.5">
            {commanderName && (
              <li
                className="flex items-center justify-between px-3 py-1.5 rounded text-sm"
                style={{ backgroundColor: '#1c2230' }}
              >
                <span style={{ color: '#e6edf3' }}>{commanderName}</span>
              </li>
            )}
            {commander.map((card) => (
              <li
                key={card.id}
                className="flex items-center justify-between px-3 py-1.5 rounded text-sm group"
                style={{ backgroundColor: '#1c2230' }}
              >
                <span style={{ color: '#e6edf3' }}>{card.card_name}</span>
                <button
                  onClick={() => onRemove(card.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-xs px-1.5 py-0.5 rounded"
                  style={{ color: '#e05c3a', backgroundColor: '#e05c3a22' }}
                  aria-label={`Remove ${card.card_name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Section title="Mainboard" cards={mainboard} onRemove={onRemove} />
    </div>
  )
}
