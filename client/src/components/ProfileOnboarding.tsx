'use client'

import { SignInButton, useUser } from '@clerk/nextjs'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Status } from '@/components/ui/Status'
import { TextField } from '@/components/ui/TextField'

type Profile = { user_id: number; first_name: string; last_name: string; email: string }
type Phase = 'loading' | 'form' | 'success' | 'error' | 'unauthorized'

export function ProfileOnboarding() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [phase, setPhase] = useState<Phase>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [fields, setFields] = useState({ first_name: '', last_name: '', email: '' })

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return
    const controller = new AbortController()
    setPhase('loading')
    setFields({ first_name: user.firstName || '', last_name: user.lastName || '', email: user.primaryEmailAddress?.emailAddress || '' })
    async function load() {
      try {
        const response = await fetch('/api/profile', { cache: 'no-store', signal: controller.signal })
        const data = await response.json()
        if (response.status === 401) { setPhase('unauthorized'); return }
        if (response.status === 403 && data.detail === 'Create your local profile first') {
          setPhase('form'); return
        }
        if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Unable to load your profile.')
        const existing = data.items[0]
        setProfile(existing || null)
        setPhase(existing ? 'success' : 'form')
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Unable to load your profile.')
        setPhase('error')
      }
    }
    void load()
    return () => controller.abort()
  }, [isLoaded, isSignedIn, user, attempt])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
      })
      const data = await response.json()
      if (response.status === 401) { setPhase('unauthorized'); return }
      if (response.status === 409) {
        // A prior request may have committed even if its response was lost.
        const check = await fetch('/api/profile', { cache: 'no-store' })
        if (check.ok) {
          const existing = (await check.json()).items[0]
          if (existing) { setProfile(existing); setPhase('success'); return }
        }
        throw new Error('These details conflict with an existing account. No accounts were linked. Check your email or contact support.')
      }
      if (response.status === 422) throw new Error('Check your name and email. Names must be 1–100 characters and the email must be valid.')
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Unable to save your profile.')
      setProfile(data)
      setPhase('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your profile. Try again.')
    } finally { setPending(false) }
  }

  if (!isLoaded) return <Status kind="loading" title="Loading your session…" />
  if (!isSignedIn) return <Status title="Welcome to your Commander table" action={<SignInButton mode="modal"><Button>Sign in</Button></SignInButton>}>Sign in to set up your profile.</Status>
  if (phase === 'loading') return <Status kind="loading" title="Loading your profile…" />
  if (phase === 'unauthorized') return <Status kind="error" title="Your session expired" action={<SignInButton mode="modal"><Button>Sign in again</Button></SignInButton>}>Sign in again to continue.</Status>
  if (phase === 'error') return <Status kind="error" title="Unable to load your profile" action={<Button onClick={() => setAttempt(value => value + 1)}>Retry</Button>}>{error}</Status>
  if (phase === 'success' && profile) return <Status kind="success" title={`Welcome, ${profile.first_name}`}>Your profile is saved. Pod management is coming next.</Status>

  return (
    <section className="ui-card ui-stack max-w-xl" aria-labelledby="profile-title">
      <div className="space-y-2">
        <h2 id="profile-title" className="text-xl font-semibold">Confirm your profile</h2>
        <p className="text-muted">Review your details to get started.</p>
      </div>
      <form onSubmit={submit} className="ui-stack" aria-busy={pending}>
        <fieldset disabled={pending} className="ui-stack min-w-0">
          <legend className="sr-only">Profile details</legend>
          <TextField label="First name" autoComplete="given-name" required maxLength={100} value={fields.first_name} onChange={event => setFields({ ...fields, first_name: event.target.value })} />
          <TextField label="Last name" autoComplete="family-name" required maxLength={100} value={fields.last_name} onChange={event => setFields({ ...fields, last_name: event.target.value })} />
          <TextField label="Email" type="email" autoComplete="email" required maxLength={255} value={fields.email} onChange={event => setFields({ ...fields, email: event.target.value })} />
        </fieldset>
        {error && <Status kind="error" title="Unable to save your profile">{error}</Status>}
        <Button type="submit" pending={pending} className="w-full sm:w-auto">{pending ? 'Saving…' : 'Save profile'}</Button>
      </form>
    </section>
  )
}
