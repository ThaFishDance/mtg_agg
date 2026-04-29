import type { Metadata } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import NavBar from '@/components/NavBar'
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
  description: 'The all-in-one Commander game tracker — life totals, deck building, and a full history of every match at your table.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="bg-[#0d1117] text-white min-h-screen">
        <NavBar />

        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
