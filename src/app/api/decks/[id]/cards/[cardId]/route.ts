import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; cardId: string }> }) {
  try {
    const { cardId } = await params
    await db.deckCard.delete({ where: { id: parseInt(cardId) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/decks/[id]/cards/[cardId] error:', error)
    return NextResponse.json({ error: 'Failed to remove card' }, { status: 500 })
  }
}
