import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const CreateDeckSchema = z.object({
  name: z.string().min(1).max(100),
  commanderName: z.string().optional(),
  commanderColors: z.array(z.string()).optional().default([]),
})

export async function GET() {
  try {
    const decks = await db.deck.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { cards: true } } },
    })
    return NextResponse.json(
      decks.map((d) => ({
        id: d.id,
        name: d.name,
        commander_name: d.commanderName,
        commander_colors: d.commanderColors,
        card_count: d._count.cards,
        created_at: d.createdAt,
      }))
    )
  } catch (error) {
    console.error('GET /api/decks error:', error)
    return NextResponse.json({ error: 'Failed to fetch decks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CreateDeckSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid', details: parsed.error.flatten() }, { status: 400 })
    }
    const { name, commanderName, commanderColors } = parsed.data
    const deck = await db.deck.create({
      data: { name, commanderName, commanderColors },
    })
    return NextResponse.json({ id: deck.id }, { status: 201 })
  } catch (error) {
    console.error('POST /api/decks error:', error)
    return NextResponse.json({ error: 'Failed to create deck' }, { status: 500 })
  }
}
