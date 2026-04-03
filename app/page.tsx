'use client'

import { useEffect, useState } from 'react'
import { Restaurant } from '@/types/restaurant'
import {
  getRestaurants,
  addRestaurant,
  deleteRestaurant,
  toggleFavourite,
} from '@/lib/storage'
import AddRestaurantForm from '@/components/AddRestaurantForm'
import RestaurantCard from '@/components/RestaurantCard'
import FilterBar from '@/components/FilterBar'

export default function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedState, setSelectedState] = useState('all')
  const [favouriteOnly, setFavouriteOnly] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setRestaurants(getRestaurants())
    setMounted(true)
  }, [])

  const handleAdd = (restaurant: Restaurant) => {
    setRestaurants(addRestaurant(restaurant))
  }

  const handleFavouriteToggle = (id: string) => {
    setRestaurants(toggleFavourite(id))
  }

  const handleDelete = (id: string) => {
    setRestaurants(deleteRestaurant(id))
  }

  // Unique states present in saved restaurants
  const availableStates = [...new Set(restaurants.map((r) => r.state))].filter(
    (s) => s !== 'Malaysia'
  )

  const filtered = restaurants.filter((r) => {
    const stateMatch = selectedState === 'all' || r.state === selectedState
    const favMatch = !favouriteOnly || r.isFavourite === true
    return stateMatch && favMatch
  })

  const stats = {
    total: restaurants.length,
    favourites: restaurants.filter((r) => r.isFavourite).length,
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[#FFFBF0]">

      {/* ── Header ── */}
      <header className="bg-[#111111] px-4 pt-8 pb-7">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <img src="/logo.png" alt="Foodmark" className="h-20 w-auto object-contain" />

            {/* Stats badges */}
            <div className="flex gap-3">
              <div className="bg-[#FFD60A] rounded-3xl px-4 py-2 text-center min-w-[64px]">
                <p className="text-[#111111] font-black text-3xl leading-none">{stats.total}</p>
                <p className="text-[#111111]/60 text-xs font-black uppercase tracking-wider mt-1">Total</p>
              </div>
              <div className="bg-[#FF3B30] rounded-3xl px-4 py-2 text-center min-w-[64px]">
                <p className="text-white font-black text-3xl leading-none">{stats.favourites}</p>
                <p className="text-white/70 text-xs font-black uppercase tracking-wider mt-1">❤ Fav</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-6">

        {/* Add form */}
        <AddRestaurantForm onAdd={handleAdd} />

        {/* Filters */}
        {restaurants.length > 0 && (
          <FilterBar
            states={availableStates}
            selectedState={selectedState}
            favouriteOnly={favouriteOnly}
            onStateChange={setSelectedState}
            onFavouriteToggle={() => setFavouriteOnly(x => !x)}
            total={filtered.length}
          />
        )}

        {/* Empty state */}
        {restaurants.length === 0 && (
          <div className="bg-white rounded-3xl p-10 text-center border-2 border-[#111111]">
            <div className="text-6xl mb-4">🍜</div>
            <h2 className="font-black text-[#111111] text-2xl mb-2">No restaurants yet!</h2>
            <p className="text-gray-500 text-sm font-semibold">
              Paste a Google Maps restaurant link above to get started.
            </p>
          </div>
        )}

        {/* No results after filter */}
        {restaurants.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-3xl p-8 text-center border-2 border-[#111111]">
            <div className="text-4xl mb-3">{favouriteOnly ? '❤️' : '🔍'}</div>
            <p className="font-black text-[#111111]">
              {favouriteOnly
                ? 'No favourites yet. Tap the ❤️ on a card to save one!'
                : 'No restaurants match this filter.'}
            </p>
          </div>
        )}

        {/* Restaurant grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {filtered.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onFavouriteToggle={handleFavouriteToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="py-6" />
    </div>
  )
}
