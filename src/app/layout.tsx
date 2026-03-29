import type { Metadata } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MTG Commander Tracker',
  description: 'The all-in-one Commander game tracker — life totals, voice card lookup, and a full history of every match at your table.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="bg-[#0d1117] text-gray-100 min-h-screen">
        {/* Navigation */}
        <nav
          className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
          style={{ backgroundColor: '#161b22', borderColor: '#c9a84c22' }}
        >
          <Link
            href="/"
            className="font-cinzel font-bold text-xl tracking-wide"
            style={{ color: '#c9a84c' }}
          >
            MTG Commander
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="/setup"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              New Game
            </Link>
            <Link
              href="/history"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              History
            </Link>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
