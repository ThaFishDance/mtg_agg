import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { TextField } from './TextField'
import { Status } from './Status'
import { Container } from './Container'
import { writeFileSync } from 'node:fs'

describe('UI accessibility contracts', () => {
  it('does not submit forms accidentally and locks pending actions', () => {
    const html = renderToStaticMarkup(<Button pending>Saving…</Button>)
    expect(html).toContain('type="button"')
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-busy="true"')
    expect(renderToStaticMarkup(<Button type="submit">Save</Button>)).toContain('type="submit"')
  })
  it('links labels, hints and validation errors to their field', () => {
    const html = renderToStaticMarkup(<TextField id="email" label="Email" hint="Use your email" error="Enter an email" required type="email" autoComplete="email" aria-describedby="extra" />)
    expect(html).toContain('for="email"')
    expect(html).toContain('id="email-hint"')
    expect(html).toContain('id="email-error"')
    expect(html).toContain('aria-describedby="extra email-hint email-error"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('role="alert"')
  })
  it('generates unique label associations for repeated fields', () => {
    const html = renderToStaticMarkup(<><TextField label="First" /><TextField label="Last" /></>)
    const ids = Array.from(html.matchAll(/<input[^>]* id="([^"]+)"/g), match => match[1])
    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])
    for (const id of ids) expect(html).toContain(`for="${id}"`)
  })
  it('announces errors urgently and other statuses politely', () => {
    expect(renderToStaticMarkup(<Status kind="error" title="Unable to save" />)).toContain('role="alert"')
    for (const kind of ['loading', 'empty', 'success', 'info'] as const) {
      expect(renderToStaticMarkup(<Status kind={kind} title="Status" />)).toContain('role="status"')
    }
  })
})

// Opt-in static fixture for browser checks; never creates an application route.
if (process.env.UI_PREVIEW_PATH) {
  const html = renderToStaticMarkup(<>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="bg-secondary"><Container><nav aria-label="Main navigation" className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3"><a href="#" className="inline-flex min-h-11 items-center font-cinzel text-lg font-semibold text-gold">MTG Manager</a><Button>Sign in</Button></nav></Container></header>
    <main id="main" tabIndex={-1}><Container className="ui-section ui-stack">
      <h1 className="ui-title">UI foundation</h1>
      <section className="ui-card ui-stack" aria-label="Form patterns">
        <TextField label="Email" type="email" autoComplete="email" hint="Use your preferred email address." required />
        <TextField label="Name" error="Enter your name to continue." defaultValue="Entered value" />
        <div className="flex flex-wrap gap-3"><Button>Save changes</Button><Button variant="secondary">Cancel</Button><Button variant="danger">Delete</Button><Button pending>Saving…</Button></div>
      </section>
      <Status kind="loading" title="Loading your pods…" />
      <Status kind="empty" title="No pods yet">Create a pod to get started.</Status>
      <Status kind="success" title="Profile saved" />
      <Status kind="error" title="Unable to connect" action={<Button variant="secondary">Retry</Button>}>Your details are preserved. Try again.</Status>
      <Status kind="info" title="Sign in required" action={<Button>Sign in</Button>}>Sign in to continue.</Status>
    </Container></main>
  </>)
  writeFileSync(process.env.UI_PREVIEW_PATH, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/ui.css"><title>UI verification</title></head><body>${html}</body></html>`)
}
