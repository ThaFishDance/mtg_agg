import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; cardId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, cardId } = await params
    const deckId = parseInt(id)

    const deck = await db.deck.findUnique({ where: { id: deckId }, select: { userId: true } })
    if (!deck || deck.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.deckCard.delete({ where: { id: parseInt(cardId) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/decks/[id]/cards/[cardId] error:', error)
    return NextResponse.json({ error: 'Failed to remove card' }, { status: 500 })
  }
}
