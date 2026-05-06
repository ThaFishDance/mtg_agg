'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {Show, UserButton, SignInButton, SignUpButton} from "@clerk/nextjs";

const NAV_LINKS = [
  { label: 'New Game', href: '/setup' },
  { label: 'Decks', href: '/decks' },
  { label: 'Inventory', href: '/inventory' },
  { label: 'History', href: '/history' },
]

export default function NavBar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 border-b"
      style={{ backgroundColor: '#161b22', borderColor: '#c9a84c33' }}
    >
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
        <div className="flex items-center gap-2 ml-2">
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
      </Show>
    </nav>
  )
}
