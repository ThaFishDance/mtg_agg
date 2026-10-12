'use client'

import ManaPip from '@/components/ManaPip'

interface DeckCard {
  id: number
  card_name: string
  quantity: number
  category: string
}

interface DeckStatsProps {
  cards: DeckCard[]
  commanderColors: string[]
  commanderName?: string | null
}

const COMMANDER_DECK_SIZE = 100

export default function DeckStats({ cards, commanderColors, commanderName }: DeckStatsProps) {
  const total = cards.length + (commanderName ? 1 : 0)
  const pct = Math.min((total / COMMANDER_DECK_SIZE) * 100, 100)

  const barColor = pct >= 100 ? '#3a9e5c' : pct >= 80 ? '#c9a84c' : '#e05c3a'

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ backgroundColor: '#1c2230', border: '1px solid #374151' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>
          Deck Stats
        </span>
        <span className="text-sm font-bold" style={{ color: barColor }}>
          {total} / {COMMANDER_DECK_SIZE}
        </span>
      </div>

      <div className="w-full rounded-full overflow-hidden" style={{ height: 6, backgroundColor: '#374151' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>

      {commanderColors.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: '#8b949e' }}>
            Colors:
          </span>
          <div className="flex gap-1">
            {commanderColors.map((c) => (
              <ManaPip key={c} color={c} size={20} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
