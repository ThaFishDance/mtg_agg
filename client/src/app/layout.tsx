import type { Metadata } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import NavBar from '@/components/NavBar'
import './globals.css'
import {ClerkProvider} from "@clerk/nextjs";

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
  description: 'MTG Manager — a fresh start for your Commander table.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
        <body className="min-h-dvh">
          <a className="skip-link" href="#main-content">Skip to content</a>
          <NavBar />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
