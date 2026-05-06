import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'] as const

const UpdateCardSchema = z.object({
  quantity: z.number().int().min(1).max(9999).optional(),
  foil: z.boolean().optional(),
  condition: z.enum(CONDITIONS).optional(),
})

export async function PUT(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { cardId } = await params
    const id = parseInt(cardId)

    const existing = await db.inventoryCard.findUnique({ where: { id }, select: { userId: true } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = UpdateCardSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid', details: parsed.error.flatten() }, { status: 400 })
    }

    const card = await db.inventoryCard.update({ where: { id }, data: parsed.data })
    return NextResponse.json({
      id: card.id,
      card_name: card.cardName,
      quantity: card.quantity,
      foil: card.foil,
      condition: card.condition,
      updated_at: card.updatedAt,
    })
  } catch (error) {
    console.error('PUT /api/inventory/[cardId] error:', error)
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { cardId } = await params
    const id = parseInt(cardId)

    const existing = await db.inventoryCard.findUnique({ where: { id }, select: { userId: true } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await db.inventoryCard.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/inventory/[cardId] error:', error)
    return NextResponse.json({ error: 'Failed to remove card' }, { status: 500 })
  }
}
