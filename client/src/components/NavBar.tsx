'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'

export default function NavBar() {
  return (
    <header className="border-b border-gold/20 bg-secondary">
      <Container>
      <nav aria-label="Main navigation" className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
        <Link href="/" className="inline-flex min-h-11 items-center font-cinzel text-lg font-semibold text-gold">MTG Manager</Link>
        <Show when="signed-out">
          <SignInButton mode="modal"><Button>Sign in</Button></SignInButton>
        </Show>
        <Show when="signed-in"><UserButton /></Show>
      </nav>
      </Container>
    </header>
  )
}
