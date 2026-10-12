import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'] as const

const AddCardSchema = z.object({
  cardName: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(9999).default(1),
  foil: z.boolean().default(false),
  condition: z.enum(CONDITIONS).default('NM'),
  scryfallId: z.string().optional(),
  setCode: z.string().optional(),
  setName: z.string().optional(),
  collectorNumber: z.string().optional(),
  imageUrl: z.union([z.string().url(), z.literal('')]).optional(),
  colorIdentity: z.array(z.string()).default([]),
  price: z.number().nullable().optional(),
  priceFoil: z.number().nullable().optional(),
})

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const cards = await db.inventoryCard.findMany({
      where: { userId },
      orderBy: [{ cardName: 'asc' }],
    })
    return NextResponse.json(
      cards.map((c) => ({
        id: c.id,
        card_name: c.cardName,
        quantity: c.quantity,
        foil: c.foil,
        condition: c.condition,
        scryfall_id: c.scryfallId ?? undefined,
        set_code: c.setCode ?? undefined,
        set_name: c.setName ?? undefined,
        collector_number: c.collectorNumber ?? undefined,
        image_url: c.imageUrl ?? undefined,
        color_identity: c.colorIdentity,
        price: c.price ?? undefined,
        price_foil: c.priceFoil ?? undefined,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }))
    )
  } catch (error) {
    console.error('GET /api/inventory error:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = AddCardSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid', details: parsed.error.flatten() }, { status: 400 })
    }
    const { cardName, quantity, foil, condition, scryfallId, setCode, setName, collectorNumber, imageUrl, colorIdentity, price, priceFoil } = parsed.data
    const card = await db.inventoryCard.create({
      data: { userId, cardName, quantity, foil, condition, scryfallId, setCode, setName, collectorNumber, imageUrl, colorIdentity, price: price ?? null, priceFoil: priceFoil ?? null },
    })
    return NextResponse.json(
      {
        id: card.id,
        card_name: card.cardName,
        quantity: card.quantity,
        foil: card.foil,
        condition: card.condition,
        scryfall_id: card.scryfallId ?? undefined,
        set_code: card.setCode ?? undefined,
        set_name: card.setName ?? undefined,
        collector_number: card.collectorNumber ?? undefined,
        image_url: card.imageUrl ?? undefined,
        color_identity: card.colorIdentity,
        price: card.price ?? undefined,
        price_foil: card.priceFoil ?? undefined,
        created_at: card.createdAt,
        updated_at: card.updatedAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/inventory error:', error)
    return NextResponse.json({ error: 'Failed to add card' }, { status: 500 })
  }
}
