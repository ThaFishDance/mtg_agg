import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const UpdateDeckSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  commanderName: z.string().optional().nullable(),
  commanderColors: z.array(z.string()).optional(),
})

async function getOwnedDeck(id: number, userId: string) {
  const deck = await db.deck.findUnique({ where: { id } })
  if (!deck || deck.userId !== userId) return null
  return deck
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const deck = await db.deck.findUnique({
      where: { id: parseInt(id) },
      include: { cards: { orderBy: [{ category: 'asc' }, { cardName: 'asc' }] } },
    })
    if (!deck || deck.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      id: deck.id,
      name: deck.name,
      commander_name: deck.commanderName,
      commander_colors: deck.commanderColors,
      created_at: deck.createdAt,
      updated_at: deck.updatedAt,
      cards: deck.cards.map((c) => ({
        id: c.id,
        card_name: c.cardName,
        quantity: c.quantity,
        category: c.category,
      })),
    })
  } catch (error) {
    console.error('GET /api/decks/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch deck' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const deckId = parseInt(id)
    const owned = await getOwnedDeck(deckId, userId)
    if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = UpdateDeckSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid', details: parsed.error.flatten() }, { status: 400 })
    }
    const deck = await db.deck.update({
      where: { id: deckId },
      data: parsed.data,
    })
    return NextResponse.json({ id: deck.id, name: deck.name })
  } catch (error) {
    console.error('PUT /api/decks/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update deck' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const deckId = parseInt(id)
    const owned = await getOwnedDeck(deckId, userId)
    if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.deck.delete({ where: { id: deckId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/decks/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete deck' }, { status: 500 })
  }
}
