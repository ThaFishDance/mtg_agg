'use client'

import { useEffect, useRef, useState } from 'react'
import type { FlashData } from '@/components/CardFlashOverlay'

// Web Speech API — not yet included in TypeScript's DOM lib
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: { length: number; [index: number]: SpeechRecognitionResult }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onerror: ((this: SpeechRecognition, ev: { error: string }) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  start(): void
  stop(): void
}

declare var SpeechRecognition: { prototype: SpeechRecognition; new(): SpeechRecognition }

const LOOKUP_COOLDOWN_MS = 2500
const DISPLAY_MS = 3000
const ACTION_PATTERNS = [
  /\b(?:i\s+)?(?:cast|play)\s+(.+)/i,
  /\b(?:i\s+)?pay\s+.+?\s+and\s+activate\s+(.+)/i,
  /\b(?:i\s+)?activate\s+(.+)/i,
]

function extractCardCandidate(transcript: string): string | null {
  const normalized = transcript.replace(/\s+/g, ' ').trim()

  for (const pattern of ACTION_PATTERNS) {
    const match = normalized.match(pattern)
    if (!match) continue

    const candidate = match[1]
      .replace(/\bcard'?s?\s+effect\b.*$/i, '')
      .replace(/\b(?:effect|ability)\b.*$/i, '')
      .replace(/\b(?:targeting|target|choose|choosing|naming|naming\s+a\s+card)\b.*$/i, '')
      .replace(/\bcard\b$/i, '')
      .replace(/[.!?,:;]+$/g, '')
      .trim()

    if (candidate.length >= 2) return candidate
  }

  return null
}

function normalizeLookupText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

interface UseVoiceCardRecognitionOptions {
  enabled: boolean
}

interface UseVoiceCardRecognitionResult {
  isSupported: boolean
  isListening: boolean
  error: string
  lastTranscript: string
  activeFlash: FlashData | null
  lastMatchedName: string
}

export default function useVoiceCardRecognition({
  enabled,
}: UseVoiceCardRecognitionOptions): UseVoiceCardRecognitionResult {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState('')
  const [lastTranscript, setLastTranscript] = useState('')
  const [activeFlash, setActiveFlash] = useState<FlashData | null>(null)
  const [lastMatchedName, setLastMatchedName] = useState('')

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const shouldRestartRef = useRef(false)
  const hideTimeoutRef = useRef<number | null>(null)
  const lookupDebounceRef = useRef<number | null>(null)
  const lastLookupRef = useRef<{ name: string; at: number }>({ name: '', at: 0 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const Recognition =
      (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition
    setIsSupported(Boolean(Recognition))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const Recognition =
      (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition

    if (!Recognition) return undefined

    async function lookupCard(candidate: string, transcript: string) {
      const normalizedCandidate = normalizeLookupText(candidate)
      const now = Date.now()
      if (
        lastLookupRef.current.name === normalizedCandidate &&
        now - lastLookupRef.current.at < LOOKUP_COOLDOWN_MS
      ) {
        return
      }

      lastLookupRef.current = { name: normalizedCandidate, at: now }

      try {
        const response = await fetch(
          `/api/cards/lookup?query=${encodeURIComponent(candidate)}`
        )
        if (!response.ok) return
        const card = await response.json()
        if (!card?.imageUrl) return

        const flash: FlashData = {
          id: `${card.id || card.name}-${Date.now()}`,
          imageUrl: card.imageUrl,
          name: card.name,
          subtitle: card.typeLine || 'Magic card',
          transcript,
        }

        setLastMatchedName(card.name)
        setActiveFlash(flash)

        if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = window.setTimeout(() => {
          setActiveFlash((current) => (current?.id === flash.id ? null : current))
        }, DISPLAY_MS)
      } catch (err) {
        console.error('Card lookup failed:', err)
      }
    }

    function scheduleLookup(transcript: string, immediate = false) {
      const candidate = extractCardCandidate(transcript)
      if (!candidate) return

      if (lookupDebounceRef.current) window.clearTimeout(lookupDebounceRef.current)

      const trigger = () => lookupCard(candidate, transcript)
      if (immediate) {
        trigger()
      } else {
        lookupDebounceRef.current = window.setTimeout(trigger, 700)
      }
    }

    if (!recognitionRef.current) {
      const recognition = new Recognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 3

      recognition.onstart = () => {
        setIsListening(true)
        setError('')
      }

      recognition.onend = () => {
        setIsListening(false)
        if (shouldRestartRef.current) {
          window.setTimeout(() => {
            try {
              recognition.start()
            } catch {
              // ignore repeated start attempts
            }
          }, 250)
        }
      }

      recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return
        if (event.error === 'not-allowed') {
          setError('Mic permission blocked')
          shouldRestartRef.current = false
          return
        }
        setError(`Voice error: ${event.error}`)
      }

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]
          const transcript = result[0]?.transcript?.trim()
          if (!transcript) continue

          setLastTranscript(transcript)
          scheduleLookup(transcript, result.isFinal)
        }
      }

      recognitionRef.current = recognition
    }

    const recognition = recognitionRef.current

    if (enabled) {
      shouldRestartRef.current = true
      try {
        recognition.start()
      } catch {
        // already started
      }
    } else {
      shouldRestartRef.current = false
      recognition.stop()
      setIsListening(false)
    }

    return () => {
      shouldRestartRef.current = false
      recognition.stop()
      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current)
      if (lookupDebounceRef.current) window.clearTimeout(lookupDebounceRef.current)
    }
  }, [enabled])

  return {
    isSupported,
    isListening,
    error,
    lastTranscript,
    activeFlash,
    lastMatchedName,
  }
}
