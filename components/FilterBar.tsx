'use client'

import { useEffect, useRef, useState } from 'react'

interface FilterBarProps {
  states: string[]
  selectedState: string
  favouriteOnly: boolean
  onStateChange: (state: string) => void
  onFavouriteToggle: () => void
  total: number
}

export default function FilterBar({
  states,
  selectedState,
  favouriteOnly,
  onStateChange,
  onFavouriteToggle,
  total,
}: FilterBarProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const label = selectedState === 'all' ? 'All States' : selectedState

  return (
    <div className="flex flex-col gap-3">

      <div className="flex items-center justify-between gap-3">

        {/* ❤️ Favourites pill */}
        <button
          onClick={onFavouriteToggle}
          className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-colors border-2 ${
            favouriteOnly
              ? 'bg-[#FF3B30] text-white border-[#FF3B30]'
              : 'bg-white text-[#111111] border-[#111111] hover:bg-red-50'
          }`}
        >
          ❤️ Favourites
        </button>

        {/* State dropdown — only shown when there are states */}
        {states.length > 0 && (
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen(x => !x)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border-2 transition-colors whitespace-nowrap ${
                selectedState !== 'all'
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white text-[#111111] border-[#111111] hover:bg-gray-50'
              }`}
            >
              {label}
              <svg
                viewBox="0 0 24 24"
                className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Dropdown menu */}
            <div
              className={`absolute right-0 top-full mt-2 min-w-[160px] bg-white border-2 border-[#111111] rounded-2xl shadow-lg overflow-hidden z-50 transition-all duration-200 origin-top ${
                open
                  ? 'opacity-100 scale-y-100 translate-y-0'
                  : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none'
              }`}
            >
              {/* All States option */}
              <button
                onClick={() => { onStateChange('all'); setOpen(false) }}
                className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                  selectedState === 'all'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#111111] hover:bg-gray-100'
                }`}
              >
                All States
              </button>

              {/* Divider */}
              <div className="h-px bg-gray-200 mx-3" />

              {/* State options */}
              {states.map((state) => (
                <button
                  key={state}
                  onClick={() => { onStateChange(state); setOpen(false) }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                    selectedState === state
                      ? 'bg-[#111111] text-white'
                      : 'text-[#111111] hover:bg-gray-100'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Count */}
      <p className="text-[#111111]/50 text-sm font-semibold px-1">
        {total} restaurant{total !== 1 ? 's' : ''}
        {selectedState !== 'all' && ` in ${selectedState}`}
        {favouriteOnly && ' · ❤️ Favourites'}
      </p>
    </div>
  )
}
