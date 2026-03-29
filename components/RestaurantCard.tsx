'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Restaurant } from '@/types/restaurant'
import StarRating from './StarRating'

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
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-red-500">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}
function HeartOutline() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinejoin="round" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  return (
    <div>

      {/* ── Card ── */}
      <div className="rounded-3xl bg-white flex flex-col h-full shadow-[0_2px_16px_rgba(0,0,0,0.08)] overflow-hidden">

        {/* Photo / colour block */}
        <div className={`relative h-[220px] ${!restaurant.photoUrl ? cardColor : ''} flex-shrink-0`}>
          {restaurant.photoUrl ? (
            <Image src={restaurant.photoUrl} alt={restaurant.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-20">🍽️</span>
            </div>
          )}

          {/* Trash — top-left of photo */}
          <button
            onClick={() => onDelete(restaurant.id)}
            title="Remove restaurant"
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/30 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200"
          >
            <TrashIcon />
          </button>

          {/* Heart — top-right of photo */}
          <button
            onClick={() => onFavouriteToggle(restaurant.id)}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
              restaurant.isFavourite ? 'bg-white shadow-lg scale-110' : 'bg-black/30 hover:bg-black/50'
            }`}
            title={restaurant.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            {restaurant.isFavourite ? <HeartFilled /> : <HeartOutline />}
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 flex-1">

          {/* Name */}
          <h3 className="font-black text-[#111111] text-2xl leading-tight line-clamp-2">
            {restaurant.name}
          </h3>

          {/* Phone */}
          {restaurant.phone && (
            <a
              href={`tel:${restaurant.phone}`}
              className="flex items-center gap-1.5 text-base font-bold text-gray-700 hover:text-[#FF6B35] transition-colors w-fit"
            >
              <span>📞</span>
              <span>{restaurant.phone}</span>
            </a>
          )}

          {/* Rating */}
          {restaurant.rating > 0 && (
            <StarRating rating={restaurant.rating} totalRatings={restaurant.totalRatings} />
          )}

          {/* Opening hours */}
          {restaurant.openingHours ? (
            <div>
              <button
                onClick={() => setHoursExpanded(x => !x)}
                className="flex items-center gap-2 text-base font-bold w-full text-left"
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  restaurant.openingHours.open_now ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className={restaurant.openingHours.open_now ? 'text-green-600' : 'text-red-500'}>
                  {restaurant.openingHours.open_now ? 'Open now' : 'Closed now'}
                </span>
                {hasWeeklyHours && (
                  <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform duration-300 ${hoursExpanded ? 'rotate-180' : ''}`} />
                )}
              </button>

              {hasWeeklyHours && (
                <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${hoursExpanded ? 'max-h-64' : 'max-h-0'}`}>
                  <ul className="mt-2 space-y-0.5 pl-4">
                    {restaurant.openingHours.weekday_text!.map((day, i) => (
                      <li key={i} className="text-sm text-gray-500 font-semibold leading-relaxed">{day}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 font-bold">🕐 Hours not available</p>
          )}

          {/* Address — expandable */}
          <button
            onClick={() => setAddressExpanded(x => !x)}
            className="text-left w-full group flex-1"
          >
            <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${addressExpanded ? 'max-h-48' : 'max-h-10'}`}>
              <p className="text-gray-500 text-sm leading-snug">
                📍 {restaurant.address}
              </p>
            </div>
            <span className={`text-xs font-bold transition-colors mt-1 inline-flex items-center gap-1 ${
              addressExpanded ? 'text-[#FF6B35]' : 'text-gray-400 group-hover:text-gray-500'
            }`}>
              {addressExpanded ? 'Show less ↑' : 'Show more ↓'}
            </span>
          </button>

          {/* Navigation */}
          <div className="flex gap-2 mt-auto">
            <a href={restaurant.googleMapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 bg-[#111111] hover:bg-[#333333] text-white text-sm font-black py-3 px-3 rounded-2xl text-center transition-colors">
              Google Maps
            </a>
            <a href={restaurant.wazeUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 bg-[#007AFF] hover:bg-[#0062cc] text-white text-sm font-black py-3 px-3 rounded-2xl text-center transition-colors">
              Waze
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}

