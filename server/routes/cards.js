import { Router } from 'express'

const router = Router()

function getCardImage(card) {
  if (card?.image_uris?.normal) return card.image_uris.normal
  if (card?.image_uris?.large) return card.image_uris.large
  if (card?.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal
  if (card?.card_faces?.[0]?.image_uris?.large) return card.card_faces[0].image_uris.large
  return null
}

router.get('/lookup', async (req, res) => {
  const query = String(req.query.query || '').trim()
  if (!query) return res.status(400).json({ error: 'query is required' })

  try {
    const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'mtg-app/voice-card-flash' },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Card not found' })
    }

    const card = await response.json()
    const imageUrl = getCardImage(card)
    if (!imageUrl) return res.status(404).json({ error: 'Card image unavailable' })

    res.json({
      id: card.id,
      name: card.name,
      typeLine: card.type_line,
      imageUrl,
    })
  } catch (err) {
    console.error('Card lookup failed:', err)
    res.status(500).json({ error: 'Lookup failed' })
  }
})

export default router
