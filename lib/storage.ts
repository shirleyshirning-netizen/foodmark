import { Restaurant } from '@/types/restaurant'

// v2 bumped to drop old data missing openingHours/isFavourite fields
const STORAGE_KEY = 'malaysia-food-list-v2'

export function getRestaurants(): Restaurant[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveRestaurants(restaurants: Restaurant[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurants))
}

export function addRestaurant(restaurant: Restaurant): Restaurant[] {
  const current = getRestaurants()
  const exists = current.find((r) => r.placeId === restaurant.placeId)
  if (exists) return current
  const updated = [restaurant, ...current]
  saveRestaurants(updated)
  return updated
}

export function updateRestaurantStatus(
  id: string,
  status: Restaurant['status']
): Restaurant[] {
  const current = getRestaurants()
  const updated = current.map((r) => (r.id === id ? { ...r, status } : r))
  saveRestaurants(updated)
  return updated
}

export function deleteRestaurant(id: string): Restaurant[] {
  const current = getRestaurants()
  const updated = current.filter((r) => r.id !== id)
  saveRestaurants(updated)
  return updated
}

export function toggleFavourite(id: string): Restaurant[] {
  const current = getRestaurants()
  const updated = current.map((r) =>
    r.id === id ? { ...r, isFavourite: !r.isFavourite } : r
  )
  saveRestaurants(updated)
  return updated
}
