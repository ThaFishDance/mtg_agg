'use client'

import { useEffect, useState } from 'react'
import { type ScryfallPrint } from '@/lib/scryfall'

export interface SelectedPrint {
  scryfallId: string
  setCode: string
  setName: string
  collectorNumber: string
  imageUrl: string
  colorIdentity: string[]
  price: number | null
  priceFoil: number | null
}

interface Props {
  cardName: string
  onSelect: (print: SelectedPrint) => void
  onClose: () => void
}

function getImageUrl(print: ScryfallPrint): string {
  return (
    print.image_uris?.normal ??
    print.image_uris?.large ??
    print.card_faces?.[0]?.image_uris?.normal ??
    ''
  )
}

export default function PrintSelectionModal({ cardName, onSelect, onClose }: Props) {
  const [prints, setPrints] = useState<ScryfallPrint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/cards/prints?name=${encodeURIComponent(cardName)}`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data: ScryfallPrint[]) => {
        if (data.length === 0) {
          setError('No printings found for this card.')
        } else {
          setPrints(data)
        }
      })
      .catch(() => setError('Failed to load printings.'))
      .finally(() => setLoading(false))
  }, [cardName])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="max-w-4xl w-full max-h-[90vh] flex flex-col rounded-xl"
        style={{ backgroundColor: '#1c2230', border: '1px solid #374151' }}
      >
        <div
          className="flex items-start justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #374151' }}
        >
          <div>
            <h2 className="font-cinzel font-bold text-lg" style={{ color: '#c9a84c' }}>
              Select a Printing
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#8b949e' }}>{cardName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none ml-4 mt-0.5 hover:opacity-70 transition-opacity"
            style={{ color: '#8b949e' }}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="text-center py-16 text-sm" style={{ color: '#8b949e' }}>
              Loading prints...
            </p>
          )}
          {!loading && error && (
            <p className="text-center py-16 text-sm" style={{ color: '#e05c3a' }}>
              {error}
            </p>
          )}
          {!loading && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
              {prints.map((print) => {
                const imgUrl = getImageUrl(print)
                const year = print.released_at?.slice(0, 4) ?? ''
                const hasFoil = print.finishes?.includes('foil')
                return (
                  <button
                    key={print.id}
                    onClick={() =>
                      onSelect({
                        scryfallId: print.id,
                        setCode: print.set,
                        setName: print.set_name,
                        collectorNumber: print.collector_number,
                        imageUrl: imgUrl,
                        colorIdentity: print.color_identity ?? [],
                        price: print.prices?.usd ? parseFloat(print.prices.usd) : null,
                        priceFoil: print.prices?.usd_foil ? parseFloat(print.prices.usd_foil) : null,
                      })
                    }
                    className="flex flex-col rounded-lg overflow-hidden text-left transition-all hover:ring-2 hover:ring-offset-1"
                    style={{
                      border: '1px solid #374151',
                      // @ts-expect-error CSS custom property
                      '--tw-ring-color': '#c9a84c',
                      '--tw-ring-offset-color': '#1c2230',
                    }}
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={`${print.set_name} #${print.collector_number}`}
                        className="w-full object-cover rounded-t-lg"
                        style={{ aspectRatio: '63/88' }}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full rounded-t-lg flex items-center justify-center text-xs"
                        style={{ aspectRatio: '63/88', backgroundColor: '#0d1117', color: '#8b949e' }}
                      >
                        No image
                      </div>
                    )}
                    <div className="px-2 py-1.5 rounded-b-lg" style={{ backgroundColor: '#0d1117' }}>
                      <p className="text-xs font-semibold truncate" style={{ color: '#e6edf3' }}>
                        {print.set_name}
                      </p>
                      <p className="text-xs" style={{ color: '#8b949e' }}>
                        #{print.collector_number} · {year}
                      </p>
                      {(print.prices?.usd || print.prices?.usd_foil) && (
                        <p className="text-xs mt-0.5" style={{ color: '#c9a84c' }}>
                          {print.prices.usd ? `$${print.prices.usd}` : ''}
                          {print.prices.usd && print.prices.usd_foil ? ' · ' : ''}
                          {print.prices.usd_foil ? `✦ $${print.prices.usd_foil}` : ''}
                        </p>
                      )}
                      {hasFoil && (
                        <span
                          className="inline-block text-[10px] px-1 rounded mt-0.5"
                          style={{ backgroundColor: '#c9a84c22', color: '#c9a84c' }}
                        >
                          Foil Available
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
