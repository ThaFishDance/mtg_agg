import Link from 'next/link'

const manaColors = [
  { key: 'W', color: '#f5f0dc', textColor: '#1a1a1a' },
  { key: 'U', color: '#4a90d9', textColor: '#fff' },
  { key: 'B', color: '#a29cad', textColor: '#fff' },
  { key: 'R', color: '#e05c3a', textColor: '#fff' },
  { key: 'G', color: '#3a9e5c', textColor: '#fff' },
]

const features = [
  {
    icon: '⚔️',
    title: 'Life Tracking',
    description:
      'Track life totals, poison counters, and commander damage for every player in real time. Visual health bars and animated effects make every change dramatic.',
    accent: '#c9a84c',
  },
  {
    icon: '🎙️',
    title: 'Voice Card Lookup',
    description:
      'Say "I cast Rhystic Study" and see the card art instantly. Voice recognition listens continuously during your game so you never lose focus on the table.',
    accent: '#4a90d9',
  },
  {
    icon: '📜',
    title: 'Game History',
    description:
      'Every completed match is saved — commanders played, final life totals, who was eliminated and when, and total game duration.',
    accent: '#3a9e5c',
  },
]

const stats = [
  { value: '2–6', label: 'Players' },
  { value: '20 / 40', label: 'Starting Life' },
  { value: '∞', label: 'Commanders' },
]

export default function LandingPage() {
  return (
    <div style={{ color: '#e6edf3' }}>
      {/* Hero */}
      <section className="text-center py-20 px-4">
        {/* Mana pip row */}
        <div className="flex justify-center gap-3 mb-10">
          {manaColors.map(({ key, color, textColor }) => (
            <div
              key={key}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-cinzel transition-transform hover:scale-125"
              style={{
                backgroundColor: color,
                color: textColor,
                boxShadow: `0 0 12px ${color}88`,
              }}
            >
              {key}
            </div>
          ))}
        </div>

        <h1
          className="font-cinzel font-bold mb-4"
          style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', color: '#c9a84c', lineHeight: 1.15 }}
        >
          MTG Game Manager
        </h1>

        <p
          className="mx-auto mb-10 leading-relaxed"
          style={{ maxWidth: '520px', color: '#8b949e', fontSize: '1.125rem' }}
        >
          The all-in-one Commander game tracker — life totals, voice card lookup, and a full
          history of every match at your table.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/setup"
            className="font-cinzel font-semibold px-8 py-3 rounded transition-all hover:brightness-110 active:scale-95 inline-block"
            style={{ backgroundColor: '#c9a84c', color: '#0d1117', fontSize: '1rem' }}
          >
            Start a Game
          </Link>
          <Link
            href="/history"
            className="font-cinzel font-semibold px-8 py-3 rounded transition-all hover:brightness-125 active:scale-95 inline-block"
            style={{
              backgroundColor: 'transparent',
              color: '#c9a84c',
              border: '1px solid #c9a84c',
              fontSize: '1rem',
            }}
          >
            View History
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="flex justify-center mb-16 px-4">
        <div
          className="w-full max-w-2xl h-px"
          style={{ background: 'linear-gradient(to right, transparent, #c9a84c55, transparent)' }}
        />
      </div>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-4 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(({ icon, title, description, accent }) => (
            <div
              key={title}
              className="rounded-xl p-6 transition-transform hover:-translate-y-1"
              style={{
                backgroundColor: '#1c2230',
                border: `1px solid ${accent}33`,
                boxShadow: `0 0 20px ${accent}11`,
              }}
            >
              <div className="text-3xl mb-4">{icon}</div>
              <h3
                className="font-cinzel font-semibold text-lg mb-3"
                style={{ color: accent }}
              >
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stat strip */}
      <section
        className="py-10 px-4 mb-20"
        style={{
          backgroundColor: '#161b22',
          borderTop: '1px solid #c9a84c22',
          borderBottom: '1px solid #c9a84c22',
        }}
      >
        <div className="max-w-3xl mx-auto grid grid-cols-3 text-center gap-8">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <div
                className="font-cinzel font-bold mb-1"
                style={{ fontSize: '2rem', color: '#c9a84c' }}
              >
                {value}
              </div>
              <div className="text-sm uppercase tracking-widest" style={{ color: '#8b949e' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="text-center px-4 pb-24">
        <h2
          className="font-cinzel font-bold mb-4"
          style={{ fontSize: '1.75rem', color: '#e6edf3' }}
        >
          Ready to play?
        </h2>
        <p className="mb-8" style={{ color: '#8b949e' }}>
          Set up your table in under a minute.
        </p>
        <Link
          href="/setup"
          className="font-cinzel font-semibold px-10 py-4 rounded-lg transition-all hover:brightness-110 active:scale-95 inline-block"
          style={{ backgroundColor: '#c9a84c', color: '#0d1117', fontSize: '1.05rem' }}
        >
          Start a Game
        </Link>
      </section>

      {/* Mana color bar */}
      <div className="h-1 w-full flex">
        {manaColors.map(({ key, color }) => (
          <div key={key} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  )
}
