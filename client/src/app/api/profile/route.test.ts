import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

const { auth, getToken } = vi.hoisted(() => ({ auth: vi.fn(), getToken: vi.fn() }))
vi.mock('@clerk/nextjs/server', () => ({ auth }))

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  auth.mockResolvedValue({ userId: 'clerk_subject', getToken })
  getToken.mockResolvedValue('session-token')
})

describe('authenticated profile bridge', () => {
  it('rejects signed-out and expired sessions without contacting the backend', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    auth.mockResolvedValueOnce({ userId: null })
    expect((await GET()).status).toBe(401)
    getToken.mockResolvedValueOnce(null)
    expect((await GET()).status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('forwards a server-acquired token and disables caching', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ items: [] }))
    vi.stubGlobal('fetch', fetch)
    vi.stubEnv('BACKEND_URL', 'http://backend.test/')
    const response = await GET()
    expect(fetch).toHaveBeenCalledWith('http://backend.test/api/v1/users?limit=1', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer session-token' }), cache: 'no-store',
    }))
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it.each([401, 403, 409, 422, 503])('preserves backend status %s and validation details', async status => {
    const detail = status === 422 ? [{ loc: ['body', 'email'], msg: 'Invalid' }] : 'Backend detail'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ detail }, { status })))
    const response = await GET()
    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ detail })
  })

  it('rejects foreign-origin writes and malformed JSON', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect((await POST(new Request('http://localhost:3000/api/profile', {
      method: 'POST', headers: { Origin: 'https://other.test' }, body: '{}',
    }))).status).toBe(403)
    expect((await POST(new Request('http://localhost:3000/api/profile', {
      method: 'POST', headers: { Origin: 'http://localhost:3000' }, body: '{',
    }))).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('forwards profile fields without adding any inferred identity', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ user_id: 1 }, { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    const body = { first_name: 'Test', last_name: 'Player', email: 'test@example.com' }
    const response = await POST(new Request('http://localhost:3000/api/profile', {
      method: 'POST', headers: { Origin: 'http://localhost:3000' }, body: JSON.stringify(body),
    }))
    expect(response.status).toBe(201)
    expect(fetch.mock.calls[0][1].body).toBe(JSON.stringify(body))
  })

  it('allows retry after backend failure without exposing exception details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('private internal address'))
      .mockResolvedValueOnce(Response.json({ items: [] })))
    const response = await GET()
    expect(response.status).toBe(502)
    expect(JSON.stringify(await response.json())).not.toContain('private internal')
    expect((await GET()).status).toBe(200)
  })
})
