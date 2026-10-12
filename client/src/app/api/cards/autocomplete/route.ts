import { NextResponse } from 'next/server'
import { autocomplete } from '@/lib/scryfall'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || ''

  try {
    const names = await autocomplete(query)
    return NextResponse.json(names.slice(0, 8))
  } catch (error) {
    console.error('GET /api/cards/autocomplete error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
