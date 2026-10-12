import { NextResponse } from 'next/server'
import { lookup } from '@/lib/scryfall'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || ''

  if (!query.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  try {
    const card = await lookup(query)
    return NextResponse.json(card)
  } catch (error) {
    console.error('GET /api/cards/lookup error:', error)
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }
}
