'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Restaurant } from '@/types/restaurant'
import StarRating from './StarRating'
import { trackEvent } from '@/lib/analytics'

interface RestaurantCardProps {
  restaurant: Restaurant
  onFavouriteToggle: (id: string) => void
  onDelete: (id: string) => void
}

const CARD_COLORS = [
  'bg-[#00B4D8]', 'bg-[#FF6B35]', 'bg-[#FFD60A]',
  'bg-[#06D6A0]', 'bg-[#E040FB]', 'bg-[#FF4081]',
]

function getCardColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length]
}

/* ── Icons ── */
function HeartFilled() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-500">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}
function HeartOutline() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinejoin="round" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}
function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export default function RestaurantCard({ restaurant, onFavouriteToggle, onDelete }: RestaurantCardProps) {
  const [addressExpanded, setAddressExpanded] = useState(false)
  const [hoursExpanded, setHoursExpanded] = useState(false)

  const cardColor = getCardColor(restaurant.name)
  const hasWeeklyHours = (restaurant.openingHours?.weekday_text?.length ?? 0) > 0

  // Opening hours — parse into two-column rows (24h format)
  const DAY_ABBR: Record<string, string> = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
    Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
  }
  const parsedHours = (restaurant.openingHours?.weekday_text ?? []).map((text) => {
    const colon = text.indexOf(':')
    const dayName = colon > -1 ? text.slice(0, colon).trim() : text
    const raw = colon > -1 ? text.slice(colon + 1).trim() : ''
    const time = raw.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi, (_, h, m, period) => {
      let hour = parseInt(h)
      hour = period.toUpperCase() === 'AM' ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12)
      return `${String(hour).padStart(2, '0')}:${m}`
    }).replace(/\s*[–—]\s*/g, ' - ')
    return { abbr: DAY_ABBR[dayName] ?? dayName.slice(0, 3), time }
  })

  return (
    <div className="rounded-2xl bg-white flex flex-col h-full shadow-[0_2px_12px_rgba(0,0,0,0.10)] overflow-hidden">

      {/* ── Photo with overlaid name ── */}
      <div className={`relative h-[160px] sm:h-[200px] ${!restaurant.photoUrl ? cardColor : ''} flex-shrink-0`}>
        {restaurant.photoUrl ? (
          <Image src={restaurant.photoUrl} alt={restaurant.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-20">🍽️</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Restaurant name on photo */}
        <div className="absolute bottom-0 left-0 right-8 p-3">
          <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow-sm">
            {restaurant.name}
          </h3>
        </div>

        {/* Trash — top-left */}
        <button
          onClick={() => onDelete(restaurant.id)}
          title="Remove restaurant"
          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/30 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200"
        >
          <TrashIcon />
        </button>

        {/* Heart — top-right */}
        <button
          onClick={() => {
            onFavouriteToggle(restaurant.id)
            trackEvent('favourite', { restaurant_name: restaurant.name, action: restaurant.isFavourite ? 'unfavourite' : 'favourite' })
          }}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
            restaurant.isFavourite ? 'bg-white shadow-lg scale-110' : 'bg-black/30 hover:bg-black/50'
          }`}
          title={restaurant.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
        >
          {restaurant.isFavourite ? <HeartFilled /> : <HeartOutline />}
        </button>
      </div>

      {/* ── Info section ── */}
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">

        {/* Rating (row 1) + Open/Closed (row 2) */}
        <div className="flex flex-col gap-1">
          {restaurant.rating > 0 && (
            <StarRating rating={restaurant.rating} totalRatings={restaurant.totalRatings} size="sm" />
          )}
          {restaurant.openingHours && (
            <button
              onClick={() => setHoursExpanded(x => !x)}
              className="flex items-center gap-1 w-fit"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${restaurant.openingHours.open_now ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-xs font-bold ${restaurant.openingHours.open_now ? 'text-green-600' : 'text-red-500'}`}>
                {restaurant.openingHours.open_now ? 'Open' : 'Closed'}
              </span>
              {hasWeeklyHours && (
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-300 ${hoursExpanded ? 'rotate-180' : ''}`} />
              )}
            </button>
          )}
        </div>

        {/* Hours expandable */}
        {hasWeeklyHours && (
          <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${hoursExpanded ? 'max-h-48' : 'max-h-0'}`}>
            <ul className="pl-0">
              {parsedHours.map(({ abbr, time }, i) => (
                <li key={i} className="flex items-baseline gap-2 text-xs leading-5 font-semibold text-gray-500">
                  <span className="w-8 shrink-0">{abbr}</span>
                  <span className="whitespace-nowrap">{time}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Phone */}
        {restaurant.phone && (
          <a
            href={`tel:${restaurant.phone}`}
            className="flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-[#FF6B35] transition-colors w-fit"
          >
            <span>📞</span>
            <span>{restaurant.phone}</span>
          </a>
        )}

        {/* Address — hidden by default, expandable */}
        <div className="flex-1">
          <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${addressExpanded ? 'max-h-48' : 'max-h-0'}`}>
            <p className="text-gray-500 text-xs leading-snug mb-1">
              📍 {restaurant.address}
            </p>
          </div>
          <button
            onClick={() => setAddressExpanded(x => !x)}
            className={`text-xs font-bold transition-colors ${addressExpanded ? 'text-[#FF6B35]' : 'text-gray-400 hover:text-gray-500'}`}
          >
            {addressExpanded ? 'Show less ↑' : 'Show more ↓'}
          </button>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-1.5 mt-auto">
          <a
            href={restaurant.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('click_google_maps', { restaurant_name: restaurant.name })}
            className="flex-1 bg-[#111111] hover:bg-[#333333] text-white text-xs font-bold py-1.5 px-2 rounded-xl text-center transition-colors"
          >
            Maps
          </a>
          <a
            href={restaurant.wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('click_waze', { restaurant_name: restaurant.name })}
            className="flex-1 bg-[#007AFF] hover:bg-[#0062cc] text-white text-xs font-bold py-1.5 px-2 rounded-xl text-center transition-colors"
          >
            Waze
          </a>
        </div>

      </div>
    </div>
  )
}
