import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const BulkCardSchema = z.object({
  cards: z.array(
    z.object({
      cardName: z.string().min(1).max(200),
      category: z.enum(['commander', 'mainboard']).default('mainboard'),
    })
  ).min(1).max(500),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const deckId = parseInt(id, 10)
  if (isNaN(deckId)) {
    return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 })
  }

  try {
    const deck = await db.deck.findUnique({ where: { id: deckId }, select: { id: true, userId: true } })
    if (!deck || deck.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = BulkCardSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid', details: parsed.error.flatten() }, { status: 400 })
    }

    const { cards } = parsed.data
    const result = await db.deckCard.createMany({
      data: cards.map((c) => ({ deckId, cardName: c.cardName, category: c.category, quantity: 1 })),
    })

    return NextResponse.json({ added: result.count }, { status: 201 })
  } catch (error) {
    console.error('POST /api/decks/[id]/cards/bulk error:', error)
    return NextResponse.json({ error: 'Failed to import cards' }, { status: 500 })
  }
}
