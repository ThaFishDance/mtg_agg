'use client'

import Link from 'next/link'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'

export default function NavBar() {
  return (
    <header className="border-b border-gold/20 bg-secondary">
      <nav aria-label="Main navigation" className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex min-h-11 items-center font-cinzel text-lg font-semibold text-gold">MTG Manager</Link>
        <Show when="signed-out">
          <SignInButton mode="modal"><button className="min-h-11 rounded-lg bg-gold px-4 py-2 font-semibold text-primary">Sign in</button></SignInButton>
        </Show>
        <Show when="signed-in"><UserButton /></Show>
      </nav>
    </header>
  )
}
