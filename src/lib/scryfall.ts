const SCRYFALL_BASE = 'https://api.scryfall.com'

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

export async function autocomplete(query: string): Promise<string[]> {
  if (!query || query.trim().length < 2) return []
  const url = `${SCRYFALL_BASE}/cards/autocomplete?q=${encodeURIComponent(query)}`
  const res = await fetchWithTimeout(url)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.data) ? data.data : []
}

export interface ScryfallCard {
  id: string
  name: string
  typeLine: string
  imageUrl: string
  colorIdentity: string[]
}

export async function lookup(query: string): Promise<ScryfallCard> {
  const url = `${SCRYFALL_BASE}/cards/named?fuzzy=${encodeURIComponent(query)}`
  const res = await fetchWithTimeout(url)
  if (!res.ok) {
    throw new Error(`Scryfall lookup failed: ${res.status}`)
  }
  const card = await res.json()

  let imageUrl = ''
  if (card.image_uris?.normal) {
    imageUrl = card.image_uris.normal
  } else if (card.image_uris?.large) {
    imageUrl = card.image_uris.large
  } else if (card.card_faces?.[0]?.image_uris?.normal) {
    imageUrl = card.card_faces[0].image_uris.normal
  }

  return {
    id: card.id,
    name: card.name,
    typeLine: card.type_line || '',
    imageUrl,
    colorIdentity: Array.isArray(card.color_identity) ? card.color_identity : [],
  }
}
