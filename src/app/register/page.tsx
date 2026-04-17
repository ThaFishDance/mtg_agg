'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed.')
      setLoading(false)
      return
    }

    // Auto sign-in after registration
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Registered, but sign-in failed. Please log in manually.')
    } else {
      router.push('/pods')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-xl p-8 space-y-6"
        style={{ backgroundColor: '#1c2230', border: '1px solid #c9a84c33' }}
      >
        <h1 className="font-cinzel text-2xl font-bold text-center" style={{ color: '#c9a84c' }}>
          Create Account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#9ca3af' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[#0d1117] text-white outline-none"
              style={{ border: '1px solid #c9a84c44' }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: '#9ca3af' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm bg-[#0d1117] text-white outline-none"
              style={{ border: '1px solid #c9a84c44' }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: '#9ca3af' }}>
              Password <span className="text-xs">(min 8 characters)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[#0d1117] text-white outline-none"
              style={{ border: '1px solid #c9a84c44' }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#c9a84c', color: '#0d1117' }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: '#9ca3af' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#c9a84c' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
