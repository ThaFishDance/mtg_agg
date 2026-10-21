import { Container } from '@/components/ui/Container'

export default function HomePage() {
  return (
    <Container className="ui-section">
      <section className="max-w-2xl space-y-4" aria-labelledby="welcome-title">
        <h1 id="welcome-title" className="ui-title">MTG Manager</h1>
        <p className="text-base text-muted sm:text-lg">A fresh start for your Commander table.</p>
      </section>
    </Container>
  )
}
