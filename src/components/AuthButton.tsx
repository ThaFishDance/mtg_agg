'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="w-20 h-7 rounded bg-white/10 animate-pulse" />
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: '#9ca3af' }}>
          {session.user.name ?? session.user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="px-3 py-1.5 rounded text-sm font-medium transition-all"
          style={{ color: '#9ca3af', border: '1px solid #c9a84c44' }}
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="px-3 py-1.5 rounded text-sm font-medium transition-all"
        style={{ color: '#9ca3af' }}
      >
        Sign In
      </Link>
      <Link
        href="/register"
        className="px-3 py-1.5 rounded text-sm font-medium transition-all"
        style={{ backgroundColor: '#c9a84c', color: '#0d1117' }}
      >
        Register
      </Link>
    </div>
  )
}
