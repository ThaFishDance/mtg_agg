import { auth } from '@clerk/nextjs/server'

export async function GET() {
  return forward()
}

export async function POST(request: Request) {
  return forward(request)
}

async function forward(request?: Request) {
  const session = await auth()
  if (!session.userId) return Response.json({ detail: 'Sign in required' }, { status: 401 })
  const token = await session.getToken()
  if (!token) return Response.json({ detail: 'Your session expired. Sign in again.' }, { status: 401 })

  let body: string | undefined
  if (request) {
    // Browser writes must originate from this application.
    if (request.headers.get('origin') !== new URL(request.url).origin) {
      return Response.json({ detail: 'Invalid request origin' }, { status: 403 })
    }
    try {
      const input = await request.json()
      body = JSON.stringify(input)
    } catch {
      return Response.json({ detail: 'Invalid JSON' }, { status: 400 })
    }
  }

  try {
    const base = process.env.BACKEND_URL || 'http://127.0.0.1:8000'
    const response = await fetch(`${base.replace(/\/$/, '')}/api/v1/users${request ? '' : '?limit=1'}`, {
      method: request ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    const data = await response.json()
    return Response.json(data, { status: response.status, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ detail: 'Unable to reach the backend. Try again.' }, { status: 502 })
  }
}
