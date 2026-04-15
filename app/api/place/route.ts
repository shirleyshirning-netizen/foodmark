import { NextRequest, NextResponse } from 'next/server'
import { parsePlaceUrl } from '@/lib/parsePlaceUrl'
import { detectStateAndCity } from '@/lib/malaysia'

// Support both NEXT_PUBLIC_ and server-only env var names
const API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
  ''

async function resolveShortUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    return res.url || url
  } catch {
    return url
  }
}

async function getPlaceDetails(placeId: string) {
  const fields = 'name,formatted_address,rating,user_ratings_total,photos,geometry,types,url,opening_hours,formatted_phone_number'
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`
  console.log(`[place] getPlaceDetails → place_id=${placeId}`)
  const res = await fetch(url)
  const data = await res.json()
  console.log(`[place] getPlaceDetails status=${data.status} error=${data.error_message ?? 'none'}`)
  if (data.status !== 'OK') return { _apiError: `${data.status}: ${data.error_message ?? ''}` }
  return data.result || null
}

async function searchPlace(query: string, lat?: number, lng?: number) {
  let url: string
  if (lat && lng) {
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=500&key=${API_KEY}`
  } else {
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' Malaysia')}&key=${API_KEY}`
  }
  console.log(`[place] searchPlace query="${query}" lat=${lat} lng=${lng}`)
  const res = await fetch(url)
  const data = await res.json()
  console.log(`[place] searchPlace status=${data.status} results=${data.results?.length ?? 0} error=${data.error_message ?? 'none'}`)
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return { _apiError: `${data.status}: ${data.error_message ?? ''}` }
  }
  return data.results?.[0] ?? null
}

async function searchByCid(cid: string) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?cid=${cid}&fields=name,formatted_address,rating,user_ratings_total,photos,geometry,types,place_id,opening_hours,formatted_phone_number&key=${API_KEY}`
  console.log(`[place] searchByCid cid=${cid}`)
  const res = await fetch(url)
  const data = await res.json()
  console.log(`[place] searchByCid status=${data.status} error=${data.error_message ?? 'none'}`)
  if (data.status !== 'OK') return { _apiError: `${data.status}: ${data.error_message ?? ''}` }
  return data.result || null
}

async function nearbySearch(lat: number, lng: number) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50&key=${API_KEY}`
  console.log(`[place] nearbySearch lat=${lat} lng=${lng}`)
  const res = await fetch(url)
  const data = await res.json()
  console.log(`[place] nearbySearch status=${data.status} results=${data.results?.length ?? 0} error=${data.error_message ?? 'none'}`)
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return { _apiError: `${data.status}: ${data.error_message ?? ''}` }
  }
  return data.results?.[0] ?? null
}

function buildPhotoUrl(photoRef: string): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${photoRef}&key=${API_KEY}`
}

function buildPhotoUrls(photos: any[]): string[] {
  return photos.slice(0, 5).map((p) => buildPhotoUrl(p.photo_reference))
}

export async function POST(req: NextRequest) {
  try {
    const { url, placeId: directPlaceId } = await req.json()

    // Guard: API key missing
    if (!API_KEY) {
      console.error('[place] ✗ API key is missing!')
      return NextResponse.json(
        { error: 'Server config error: Google Places API key is not set.' },
        { status: 500 }
      )
    }

    // Direct place_id path — from autocomplete selection
    if (directPlaceId) {
      console.log(`[place] Direct placeId: ${directPlaceId}`)
      const placeData = await getPlaceDetails(directPlaceId)
      if (!placeData) {
        return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 })
      }
      if (placeData._apiError) {
        return NextResponse.json({ error: `Google Places API error: ${placeData._apiError}` }, { status: 502 })
      }
      const address = placeData.formatted_address || placeData.vicinity || ''
      const { state, city } = detectStateAndCity(address)
      const lat = placeData.geometry?.location?.lat
      const lng = placeData.geometry?.location?.lng
      const photoUrls = placeData.photos?.length > 0 ? buildPhotoUrls(placeData.photos) : undefined
      const photoUrl = photoUrls?.[0]
      const placeId = placeData.place_id || directPlaceId
      const openingHours = placeData.opening_hours
        ? { open_now: placeData.opening_hours.open_now, weekday_text: placeData.opening_hours.weekday_text || [] }
        : undefined
      console.log(`[place] ✓ Success (direct): ${placeData.name}`)
      return NextResponse.json({
        name: placeData.name || 'Unknown Restaurant',
        address, rating: placeData.rating || 0, totalRatings: placeData.user_ratings_total || 0,
        photoUrl, photoUrls, placeId, state, city, lat, lng,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        wazeUrl: lat && lng ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(placeData.name || '')}`,
        types: placeData.types || [], openingHours, phone: placeData.formatted_phone_number || undefined,
      })
    }

    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })
    console.log(`[place] API key present: ...${API_KEY.slice(-6)}`)

    let resolvedUrl = url
    let parsed = parsePlaceUrl(url)
    console.log(`[place] Input URL: ${url}`)
    console.log(`[place] Parsed:`, JSON.stringify(parsed))

    // Resolve short URL first
    if (parsed?.type === 'short_url') {
      resolvedUrl = await resolveShortUrl(url)
      console.log(`[place] Resolved short URL → ${resolvedUrl}`)
      parsed = parsePlaceUrl(resolvedUrl)
      console.log(`[place] Re-parsed:`, JSON.stringify(parsed))
    }

    if (!parsed) {
      return NextResponse.json(
        { error: `Could not parse URL as a Google Maps link. Got: ${resolvedUrl}` },
        { status: 400 }
      )
    }

    let placeData: any = null

    if (parsed.type === 'place_id') {
      placeData = await getPlaceDetails(parsed.value)
    } else if (parsed.type === 'cid') {
      placeData = await searchByCid(parsed.value)
    } else if (parsed.type === 'query') {
      const searchResult = await searchPlace(parsed.value, parsed.lat, parsed.lng)
      if (searchResult?._apiError) {
        placeData = searchResult
      } else if (searchResult?.place_id) {
        placeData = await getPlaceDetails(searchResult.place_id)
        if (!placeData) placeData = searchResult
      }
    } else if (parsed.type === 'coords' && parsed.lat && parsed.lng) {
      const searchResult = await nearbySearch(parsed.lat, parsed.lng)
      if (searchResult?._apiError) {
        placeData = searchResult
      } else if (searchResult?.place_id) {
        placeData = await getPlaceDetails(searchResult.place_id)
        if (!placeData) placeData = searchResult
      }
    }

    // Surface API errors to the client
    if (placeData?._apiError) {
      return NextResponse.json(
        { error: `Google Places API error: ${placeData._apiError}` },
        { status: 502 }
      )
    }

    if (!placeData) {
      return NextResponse.json(
        { error: 'Restaurant not found. The place may not exist in Google Places, or the link format is unsupported.' },
        { status: 404 }
      )
    }

    const address = placeData.formatted_address || placeData.vicinity || ''
    const { state, city } = detectStateAndCity(address)

    const lat = placeData.geometry?.location?.lat
    const lng = placeData.geometry?.location?.lng

    const photoUrls =
      placeData.photos && placeData.photos.length > 0
        ? buildPhotoUrls(placeData.photos)
        : undefined
    const photoUrl = photoUrls?.[0]

    const placeId = placeData.place_id || parsed.value
    const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`
    const wazeUrl =
      lat && lng
        ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        : `https://waze.com/ul?q=${encodeURIComponent(placeData.name || '')}`

    console.log(`[place] ✓ Success: ${placeData.name}`)

    const openingHours = placeData.opening_hours
      ? {
          open_now: placeData.opening_hours.open_now,
          weekday_text: placeData.opening_hours.weekday_text || [],
        }
      : undefined

    return NextResponse.json({
      name: placeData.name || 'Unknown Restaurant',
      address,
      rating: placeData.rating || 0,
      totalRatings: placeData.user_ratings_total || 0,
      photoUrl,
      photoUrls,
      placeId,
      state,
      city,
      lat,
      lng,
      googleMapsUrl,
      wazeUrl,
      types: placeData.types || [],
      openingHours,
      phone: placeData.formatted_phone_number || undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[place] Exception:', msg)
    return NextResponse.json({ error: `Server exception: ${msg}` }, { status: 500 })
  }
}
