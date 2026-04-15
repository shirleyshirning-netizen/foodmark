'use client'

import { useState, useRef, useEffect } from 'react'
import { Restaurant } from '@/types/restaurant'
import { trackEvent } from '@/lib/analytics'

interface AddRestaurantFormProps {
  onAdd: (restaurant: Restaurant) => void
}

interface Suggestion {
  placeId: string
  name: string
  address: string
}

function isShareGoogleUrl(url: string): boolean {
  try {
    return new URL(url).hostname === 'share.google'
  } catch {
    return false
  }
}

function looksLikeUrl(input: string): boolean {
  const t = input.trim()
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.includes('maps.google') ||
    t.includes('goo.gl') ||
    t.includes('share.google')
  )
}

type Step = 'idle' | 'resolving' | 'fetching'

export default function AddRestaurantForm({ onAdd }: AddRestaurantFormProps) {
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const loading = step !== 'idle'
  const isUrlMode = looksLikeUrl(url)
  const isSearchMode = !isUrlMode && url.trim().length >= 2

  // Debounced autocomplete
  useEffect(() => {
    if (!isSearchMode) {
      setSuggestions([])
      setShowDropdown(false)
      setNoResults(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      setNoResults(false)
      try {
        const res = await fetch(`/api/autocomplete?input=${encodeURIComponent(url.trim())}`)
        const data = await res.json()
        if (data.suggestions) {
          setSuggestions(data.suggestions)
          setShowDropdown(true)
          setNoResults(data.suggestions.length === 0)
        }
      } catch {
        // silent fail
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [url, isSearchMode])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchAndAdd(placeId?: string, urlToFetch?: string) {
    setError('')
    setStep('fetching')

    try {
      let res: Response

      if (placeId) {
        res = await fetch('/api/place', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId }),
        })
      } else if (urlToFetch && isShareGoogleUrl(urlToFetch)) {
        setStep('resolving')
        res = await fetch('/api/resolve-share-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlToFetch }),
        })
      } else {
        res = await fetch('/api/place', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlToFetch }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to fetch restaurant data')
        inputRef.current?.blur()
        return
      }

      const restaurant: Restaurant = {
        id: `${data.placeId}-${Date.now()}`,
        ...data,
        status: null,
        addedAt: new Date().toISOString(),
      }

      onAdd(restaurant)
      setUrl('')
      setSuggestions([])
      setShowDropdown(false)
      inputRef.current?.blur()
      trackEvent('add_restaurant', { restaurant_name: restaurant.name, state: restaurant.state || 'unknown' })
    } catch {
      setError('Network error. Please try again.')
      inputRef.current?.blur()
    } finally {
      setStep('idle')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || !isUrlMode) return
    await fetchAndAdd(undefined, url.trim())
  }

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setShowDropdown(false)
    setUrl(suggestion.name)
    await fetchAndAdd(suggestion.placeId)
  }

  return (
    <div className="py-1">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative" ref={containerRef}>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError('')
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true)
              }}
              placeholder="Search restaurant..."
              className="w-full sm:flex-1 bg-white border-2 border-[#111111] rounded-2xl px-4 py-4 font-semibold text-[#111111] placeholder-gray-400 outline-none focus:border-[#FF6B35] transition-colors"
              style={{ fontSize: '16px' }}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading || !url.trim() || !isUrlMode}
              className="w-full h-[52px] sm:w-auto sm:h-auto bg-[#FF6B35] hover:bg-[#e85c27] disabled:opacity-40 text-white font-black px-6 py-4 rounded-2xl transition-colors whitespace-nowrap text-sm"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : '+ Add Restaurant'}
            </button>
          </div>

          {/* Search dropdown */}
          {isSearchMode && (showDropdown || isSearching) && (
            <div className="absolute top-full left-0 right-0 sm:right-[88px] mt-2 bg-white border-2 border-[#111111] rounded-2xl shadow-lg overflow-hidden z-50">
              {isSearching && suggestions.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-4 py-4 text-gray-400 text-sm font-semibold">
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Searching...
                </div>
              ) : noResults ? (
                <div className="px-4 py-4 text-gray-400 text-sm font-semibold text-center">
                  No results found
                </div>
              ) : (
                suggestions.map((s, i) => (
                  <button
                    key={s.placeId}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectSuggestion(s)
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-[#FFF5E6] active:bg-[#FFE9CC] transition-colors${i < suggestions.length - 1 ? ' border-b border-gray-100' : ''}`}
                  >
                    <p className="font-bold text-[#111111] text-sm leading-snug">{s.name}</p>
                    {s.address && (
                      <p className="text-gray-400 text-xs mt-0.5 leading-snug">{s.address}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-400 text-red-700 text-sm font-bold px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

      </form>
    </div>
  )
}
