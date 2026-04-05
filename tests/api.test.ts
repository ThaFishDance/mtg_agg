import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mocks (hoisted) ---

vi.mock('@/lib/db', () => ({
  db: {
    game: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/scryfall', () => ({
  autocomplete: vi.fn(),
}))

// --- imports (after mocks) ---

import { db } from '@/lib/db'
import { autocomplete } from '@/lib/scryfall'
import { GET as healthGET } from '@/app/api/health/route'
import { GET as autocompleteGET } from '@/app/api/cards/autocomplete/route'
import { GET as gamesGET, POST as gamesPOST } from '@/app/api/games/route'
import { GET as gameByIdGET } from '@/app/api/games/[id]/route'
import { GET as colorStatsGET } from '@/app/api/games/stats/colors/route'

const mockDb = db as {
  game: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
  $queryRaw: ReturnType<typeof vi.fn>
}

const mockAutocomplete = autocomplete as ReturnType<typeof vi.fn>

function makeRequest(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await healthGET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(typeof body.timestamp).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// Cards autocomplete
// ---------------------------------------------------------------------------

describe('GET /api/cards/autocomplete', () => {
  it('returns empty array when query is missing', async () => {
    mockAutocomplete.mockResolvedValue([])
    const res = await autocompleteGET(makeRequest('/api/cards/autocomplete'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns empty array when query is blank', async () => {
    mockAutocomplete.mockResolvedValue([])
    const res = await autocompleteGET(makeRequest('/api/cards/autocomplete?query=   '))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns suggestions from scryfall', async () => {
    mockAutocomplete.mockResolvedValue(['The Wise Mothman', 'The Wise Fool'])
    const res = await autocompleteGET(makeRequest('/api/cards/autocomplete?query=the+wise+moth'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(['The Wise Mothman', 'The Wise Fool'])
    expect(mockAutocomplete).toHaveBeenCalledWith('the wise moth')
  })

  it('caps results at 8', async () => {
    mockAutocomplete.mockResolvedValue(Array.from({ length: 12 }, (_, i) => `Card ${i}`))
    const res = await autocompleteGET(makeRequest('/api/cards/autocomplete?query=card'))
    expect((await res.json()).length).toBe(8)
  })
})

// ---------------------------------------------------------------------------
// GET /api/games
// ---------------------------------------------------------------------------

describe('GET /api/games', () => {
  it('returns 200 with list of games', async () => {
    mockDb.game.findMany.mockResolvedValue([])
    const res = await gamesGET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns 500 on db error', async () => {
    mockDb.game.findMany.mockRejectedValue(new Error('db down'))
    const res = await gamesGET()
    expect(res.status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// POST /api/games
// ---------------------------------------------------------------------------

describe('POST /api/games', () => {
  const validPayload = {
    startingLife: 40,
    players: [
      { name: 'Alice', commanderName: 'Atraxa', colorIdentity: ['W', 'U', 'B', 'G'] },
      { name: 'Bob', commanderName: 'Sliver Overlord', colorIdentity: ['W', 'U', 'B', 'R', 'G'] },
    ],
  }

  it('creates a game and returns gameId and players', async () => {
    mockDb.game.create.mockResolvedValue({
      id: 1,
      players: [
        { id: 10, playerName: 'Alice' },
        { id: 11, playerName: 'Bob' },
      ],
    })

    const res = await gamesPOST(
      makeRequest('/api/games', { method: 'POST', body: JSON.stringify(validPayload) })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.gameId).toBe(1)
    expect(body.players).toHaveLength(2)
    expect(body.players[0]).toEqual({ id: 10, name: 'Alice' })
  })

  it('returns 400 when fewer than 2 players are provided', async () => {
    const payload = {
      startingLife: 40,
      players: [{ name: 'Alice', commanderName: 'Atraxa', colorIdentity: ['W'] }],
    }
    const res = await gamesPOST(
      makeRequest('/api/games', { method: 'POST', body: JSON.stringify(payload) })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when players field is missing', async () => {
    const res = await gamesPOST(
      makeRequest('/api/games', { method: 'POST', body: JSON.stringify({ startingLife: 40 }) })
    )
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// GET /api/games/[id]
// ---------------------------------------------------------------------------

describe('GET /api/games/[id]', () => {
  it('returns 404 for a missing game', async () => {
    mockDb.game.findUnique.mockResolvedValue(null)
    const res = await gameByIdGET(makeRequest('/api/games/9999'), {
      params: Promise.resolve({ id: '9999' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 for a non-numeric id', async () => {
    const res = await gameByIdGET(makeRequest('/api/games/abc'), {
      params: Promise.resolve({ id: 'abc' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns the game when found', async () => {
    mockDb.game.findUnique.mockResolvedValue({
      id: 1,
      startedAt: new Date(),
      completedAt: new Date(),
      durationSeconds: 120,
      startingLife: 40,
      winnerName: 'Alice',
      playerCount: 2,
      players: [],
    })
    const res = await gameByIdGET(makeRequest('/api/games/1'), {
      params: Promise.resolve({ id: '1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(1)
    expect(body.winner_name).toBe('Alice')
  })
})

// ---------------------------------------------------------------------------
// GET /api/games/stats/colors
// ---------------------------------------------------------------------------

describe('GET /api/games/stats/colors', () => {
  it('returns color stats', async () => {
    mockDb.$queryRaw.mockResolvedValue([
      { color: 'U', wins: BigInt(3), appearances: BigInt(5) },
    ])
    mockDb.game.count.mockResolvedValue(10)

    const res = await colorStatsGET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalGames).toBe(10)
    expect(body.colors).toHaveLength(1)
    expect(body.colors[0]).toMatchObject({ color: 'U', wins: 3, appearances: 5, winRate: 60 })
  })

  it('returns 500 on db error', async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error('db error'))
    const res = await colorStatsGET()
    expect(res.status).toBe(500)
  })
})
