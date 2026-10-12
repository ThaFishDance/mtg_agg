'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Show, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs"

const NAV_LINKS = [
  { label: 'New Game', href: '/setup' },
  { label: 'Decks', href: '/decks' },
  { label: 'Inventory', href: '/inventory' },
  { label: 'History', href: '/history' },
]

export default function NavBar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="relative top-0 z-50 border-b"
      style={{ backgroundColor: '#161b22', borderColor: '#c9a84c33' }}
    >
      {/* Main row */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <Link
          href="/"
          className="font-cinzel font-bold text-xl tracking-wide text-gold"
        >
          MTG Manager
        </Link>

        <Show when="signed-out">
          <div className="flex items-center gap-2 ml-2">
            <SignInButton />
            <SignUpButton />
          </div>
        </Show>

        <Show when="signed-in">
          <>
            {/* Desktop: inline links + UserButton */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              {NAV_LINKS.map(({ label, href }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className="px-3 py-1.5 rounded text-sm font-medium transition-all"
                    style={
                      active
                        ? { backgroundColor: '#c9a84c', color: '#0d1117' }
                        : { color: '#9ca3af' }
                    }
                  >
                    {label}
                  </Link>
                )
              })}
              <UserButton />
            </div>

            {/* Mobile: UserButton + hamburger */}
            <div className="flex sm:hidden items-center gap-3 ml-2">
              <UserButton />
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-colors"
                style={{ backgroundColor: '#ffffff11', color: '#9ca3af' }}
                aria-label="Toggle menu"
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            </div>
          </>
        </Show>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="sm:hidden border-t px-4 py-3 space-y-1"
          style={{ backgroundColor: '#161b22', borderColor: '#c9a84c33' }}
        >
          {NAV_LINKS.map(({ label, href }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={
                  active
                    ? { backgroundColor: '#c9a84c', color: '#0d1117' }
                    : { color: '#9ca3af' }
                }
              >
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
