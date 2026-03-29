export interface OpeningHours {
  open_now?: boolean
  weekday_text?: string[]
}

export interface Restaurant {
  id: string
  name: string
  address: string
  rating: number
  totalRatings: number
  photoUrl?: string
  placeId: string
  state: string
  city: string
  status: 'want-to-go' | 'been-there' | null
  isFavourite?: boolean
  phone?: string
  openingHours?: OpeningHours
  addedAt: string
  googleMapsUrl: string
  wazeUrl: string
  lat?: number
  lng?: number
  types?: string[]
}
