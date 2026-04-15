'use client'

import { useEffect, useRef, useState } from 'react'

interface FilterBarProps {
  states: string[]
  selectedState: string
  cities: string[]
  selectedCity: string
  favouriteOnly: boolean
  onStateChange: (state: string) => void
  onCityChange: (city: string) => void
  onFavouriteToggle: () => void
  total: number
}

function Dropdown({
  label,
  active,
  options,
  allLabel,
  selected,
  onSelect,
}: {
  label: string
  active: boolean
  options: string[]
  allLabel: string
  selected: string
  onSelect: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        onClick={() => setOpen(x => !x)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-full text-sm font-bold border-2 transition-colors ${
          active
            ? 'bg-[#111111] text-white border-[#111111]'
            : 'bg-white text-[#111111] border-[#111111] hover:bg-gray-50'
        }`}
      >
        <span className="truncate">{label}</span>
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

      <div
        className={`absolute left-0 top-full mt-2 min-w-full bg-white border-2 border-[#111111] rounded-2xl shadow-lg overflow-hidden z-50 transition-all duration-200 origin-top ${
          open
            ? 'opacity-100 scale-y-100 translate-y-0'
            : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none'
        }`}
      >
        <button
          onClick={() => { onSelect('all'); setOpen(false) }}
          className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
            selected === 'all'
              ? 'bg-[#111111] text-white'
              : 'text-[#111111] hover:bg-gray-100'
          }`}
        >
          {allLabel}
        </button>

        {options.length > 0 && <div className="h-px bg-gray-200 mx-3" />}

        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => { onSelect(opt); setOpen(false) }}
            className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
              selected === opt
                ? 'bg-[#111111] text-white'
                : 'text-[#111111] hover:bg-gray-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FilterBar({
  states,
  selectedState,
  cities,
  selectedCity,
  favouriteOnly,
  onStateChange,
  onCityChange,
  onFavouriteToggle,
  total,
}: FilterBarProps) {
  const stateLabel = selectedState === 'all' ? 'All States' : selectedState
  const cityLabel = selectedCity === 'all' ? 'All Cities' : selectedCity

  return (
    <div className="flex flex-col gap-3">

      {/* Single row: ❤️ | State | City */}
      <div className="flex gap-2">
        {/* Favourites icon button — fixed 48px square */}
        <button
          onClick={onFavouriteToggle}
          className={`w-12 h-10 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-colors ${
            favouriteOnly
              ? 'bg-[#FF3B30] border-[#FF3B30]'
              : 'bg-white border-[#111111] hover:bg-red-50'
          }`}
        >
          ❤️
        </button>

        <Dropdown
          label={stateLabel}
          active={selectedState !== 'all'}
          options={states}
          allLabel="All States"
          selected={selectedState}
          onSelect={onStateChange}
        />
        <Dropdown
          label={cityLabel}
          active={selectedCity !== 'all'}
          options={cities}
          allLabel="All Cities"
          selected={selectedCity}
          onSelect={onCityChange}
        />
      </div>

      {/* Count */}
      <p className="text-[#111111]/50 text-sm font-semibold px-1">
        {total} restaurant{total !== 1 ? 's' : ''}
        {selectedState !== 'all' && ` in ${selectedState}`}
        {selectedCity !== 'all' && ` · ${selectedCity}`}
        {favouriteOnly && ' · ❤️ Favourites'}
      </p>
    </div>
  )
}
