'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Pod {
  id: string
  name: string
  role: string
}

interface PodSelectorProps {
  value: string | null
  onChange: (podId: string) => void
}

export default function PodSelector({ value, onChange }: PodSelectorProps) {
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pods')
      .then((r) => r.json())
      .then((data: Pod[]) => {
        setPods(data)
        if (data.length === 1 && !value) {
          onChange(data[0].id)
        }
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="h-10 rounded-lg bg-white/10 animate-pulse" />
  }

  if (pods.length === 0) {
    return (
      <p className="text-sm" style={{ color: '#9ca3af' }}>
        You have no pods yet.{' '}
        <Link href="/pods" style={{ color: '#c9a84c' }}>
          Create or join one
        </Link>{' '}
        first.
      </p>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Pod</label>
      <div className="flex flex-wrap gap-2">
        {pods.map((pod) => (
          <button
            key={pod.id}
            type="button"
            onClick={() => onChange(pod.id)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={
              value === pod.id
                ? { backgroundColor: '#c9a84c', color: '#0d1117' }
                : { backgroundColor: '#161b22', color: '#9ca3af', border: '1px solid #374151' }
            }
          >
            {pod.name}
          </button>
        ))}
      </div>
    </div>
  )
}
