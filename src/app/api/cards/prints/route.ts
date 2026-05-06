import { NextResponse } from 'next/server'
import { fetchPrints } from '@/lib/scryfall'

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name') || ''
  if (!name.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  try {
    const prints = await fetchPrints(name.trim())
    return NextResponse.json(prints)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch prints' }, { status: 500 })
  }
}
