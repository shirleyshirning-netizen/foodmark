'use client'

import { useState } from 'react'
import { Restaurant } from '@/types/restaurant'

interface AddRestaurantFormProps {
  onAdd: (restaurant: Restaurant) => void
}

function isShareGoogleUrl(url: string): boolean {
  try {
    return new URL(url).hostname === 'share.google'
  } catch {
    return false
  }
}

type Step = 'idle' | 'resolving' | 'fetching'

export default function AddRestaurantForm({ onAdd }: AddRestaurantFormProps) {
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')
  const [debugLog, setDebugLog] = useState<string[]>([])

  const loading = step !== 'idle'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setError('')
    setDebugLog([])
    let finalUrl = url.trim()

    try {
      let data: any

      if (isShareGoogleUrl(finalUrl)) {
        // share.google: resolve + Places lookup in one server call
        setStep('resolving')
        const resolveRes = await fetch('/api/resolve-share-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: finalUrl }),
        })
        data = await resolveRes.json()
        if (!resolveRes.ok) {
          setError(data.error || 'Could not resolve the share.google link.')
          return
        }
      } else {
        // Normal Google Maps link
        setStep('fetching')
        const res = await fetch('/api/place', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: finalUrl }),
        })
        data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to fetch restaurant data')
          return
        }
      }

      const restaurant: Restaurant = {
        id: `${data.placeId}-${Date.now()}`,
        ...data,
        status: null,
        addedAt: new Date().toISOString(),
      }

      onAdd(restaurant)
      setUrl('')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setStep('idle')
    }
  }

  const buttonContent = loading ? (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  ) : '+ Add'

  return (
    <div className="py-2">
      <h2 className="font-black text-[#111111] text-xl mb-5 tracking-tight">
        Add Restaurant
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste Google Maps link here..."
            className="flex-1 bg-white border-2 border-[#111111] rounded-2xl px-4 py-4 text-sm font-semibold text-[#111111] placeholder-gray-400 outline-none focus:border-[#FF6B35] transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="bg-[#FF6B35] hover:bg-[#e85c27] disabled:opacity-40 text-white font-black px-6 py-4 rounded-2xl transition-colors whitespace-nowrap text-sm"
          >
            {buttonContent}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-400 text-red-700 text-sm font-bold px-4 py-3 rounded-2xl flex flex-col gap-2">
            <span>{error}</span>
            {debugLog.length > 0 && (
              <details className="text-xs text-red-600">
                <summary className="cursor-pointer font-black">Debug log</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all bg-red-100 rounded-xl p-2 leading-relaxed">
                  {debugLog.join('\n')}
                </pre>
              </details>
            )}
          </div>
        )}

        <p className="text-gray-400 text-xs font-semibold">
          Supports: Google Maps links, share.google links, maps.app.goo.gl short links
        </p>
      </form>
    </div>
  )
}
