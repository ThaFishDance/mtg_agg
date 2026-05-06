import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const AddCardSchema = z.object({
  cardName: z.string().min(1),
  category: z.enum(['commander', 'mainboard']).default('mainboard'),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const deckId = parseInt(id)
    const deck = await db.deck.findUnique({ where: { id: deckId }, select: { id: true, userId: true } })
    if (!deck || deck.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = AddCardSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid', details: parsed.error.flatten() }, { status: 400 })
    }
    const { cardName, category } = parsed.data
    const card = await db.deckCard.create({
      data: { deckId, cardName, category },
    })
    return NextResponse.json({ id: card.id, card_name: card.cardName, quantity: card.quantity, category: card.category }, { status: 201 })
  } catch (error) {
    console.error('POST /api/decks/[id]/cards error:', error)
    return NextResponse.json({ error: 'Failed to add card' }, { status: 500 })
  }
}
