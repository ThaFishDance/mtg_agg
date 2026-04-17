'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditPodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: podId } = use(params)
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/pods/${podId}`)
      .then((r) => {
        if (!r.ok) router.push('/pods')
        return r.json()
      })
      .then((pod) => {
        if (pod.myRole !== 'OWNER') {
          router.push(`/pods/${podId}`)
          return
        }
        setName(pod.name)
        setDescription(pod.description ?? '')
      })
      .finally(() => setLoading(false))
  }, [podId, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch(`/api/pods/${podId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || undefined }),
    })
    setSaving(false)
    if (res.ok) {
      router.push(`/pods/${podId}`)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href={`/pods/${podId}`} className="text-sm mb-4 block" style={{ color: '#9ca3af' }}>
        ← Back to Pod
      </Link>

      <h1 className="font-cinzel text-2xl font-bold mb-6" style={{ color: '#c9a84c' }}>
        Edit Pod
      </h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl p-6 space-y-4"
        style={{ backgroundColor: '#1c2230', border: '1px solid #c9a84c33' }}
      >
        <div>
          <label className="block text-sm mb-1" style={{ color: '#9ca3af' }}>Pod Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            className="w-full px-3 py-2 rounded-lg text-sm bg-[#0d1117] text-white outline-none"
            style={{ border: '1px solid #c9a84c44' }}
          />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: '#9ca3af' }}>
            Description <span className="text-xs">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm bg-[#0d1117] text-white outline-none resize-none"
            style={{ border: '1px solid #c9a84c44' }}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: '#c9a84c', color: '#0d1117' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link
            href={`/pods/${podId}`}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: '#9ca3af' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
